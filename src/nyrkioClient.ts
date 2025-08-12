/* eslint @typescript-eslint/naming-convention: 0 */

import axios from 'axios';
import * as core from '@actions/core';
import artifact from '@actions/artifact';
import { UploadArtifactOptions } from '@actions/artifact';
import { Config } from './config';
import * as fs from 'fs';

export interface ChallengePublishSession {
    username: string;
    client_secret: string;
    server_secret: string;
}

export interface ChallengePublishClaim {
    username: string; // In the case of a push event, this is the repo_owner, but for PRs this is the PR author, or `actor` in the workflow lingo
    client_secret: string;

    repo_owner: string;
    repo_name: string;
    repo_owner_email?: string; // TODO: These aren't in the pull_request payload, but could probably get them from seprately querying data about repo
    repo_owner_full_name?: string; // Otoh would expect users to always use the `push` (post merge) actions for Nyrkiö, since that is our main use case.
    // So we'll get the owner's email there, eventually
    workflow_name: string; // github.workflow
    event_name: string;
    run_number: number;
    run_id: number;
}

// First response from the service we authenticate with
export interface ChallengePublishChallenge {
    session: ChallengePublishSession;
    public_challenge: string; // A random string, such as an uuid4.
    public_message: string; // Human readable sentence that contains above random string. We need to publish is somewhere where the server can read it.
    artifact_id?: number; // Client must provide a link to the server so it can download the log and verify the challenge
    claimed_identity: ChallengePublishClaim;
}

export interface ChallengePublishHandshakeComplete {
    session: ChallengePublishSession;
    artifact_id: number;
}

export class NyrkioClient {
    neverFail = false;
    nyrkioApiRoot = 'https://nyrkio.com/api/v0/';
    version = 'v0';
    httpOptions = { headers: { Authorization: '' } };
    challengePublishClaim: ChallengePublishClaim | undefined;
    isRepoOwner = false;

    constructor(config: Config) {
        const { nyrkioApiRoot, nyrkioToken, neverFail } = config;
        this.nyrkioApiRoot = nyrkioApiRoot || this.nyrkioApiRoot;
        if (nyrkioToken) {
            this.httpOptions.headers.Authorization = 'Bearer ' + (nyrkioToken ? nyrkioToken : '');
        }
        this.neverFail = neverFail;
    }

    async challengePublishHandshakeClaim(claim: ChallengePublishClaim): Promise<ChallengePublishChallenge | undefined> {
        const uri = this.nyrkioApiRoot + 'challenge_publish/github/claim';
        this.challengePublishClaim = claim;
        const challenge: ChallengePublishChallenge = await this._post(uri, claim);
        return challenge ? challenge : undefined;
    }

    async challengePublishHandshakeComplete(challenge: ChallengePublishChallenge): Promise<string | null> {
        if (this.challengePublishClaim === undefined) {
            throw new Error(
                'You must call challengePublishHandshakeClaim() before challengePublishHandshakeComplete()',
            );
        }

        challenge = await uploadChallengeArtifact(challenge, {});

        const session = challenge.session;
        const uri = this.nyrkioApiRoot + 'challenge_publish/github/complete';
        // const data: any = await this._post(uri, session);
        const data: any = await this._post(uri, { session: session, artifact_id: challenge.artifact_id });

        if (data) {
            if (this.challengePublishClaim.username === this.challengePublishClaim.repo_owner) {
                this.isRepoOwner = true;
            }
            core.info(data.message);
            return data.jwt_token;
        }
        return null;
    }

    async _post(uri: string, data: any): Promise<any> {
        try {
            console.log(`POST: ${uri}`);

            const response = await axios.post(uri, data, this.httpOptions);
            core.debug(`Response from ${uri}: `);
            console.debug(response);
            if (response.data) {
                core.debug('--------success-------');
                return response.data;
            } else {
                console.error(`Empty response from ${uri}`);
                return false;
            }
        } catch (err: any) {
            this._error_handler(err, uri);
            return false;
        }
    }

    _error_handler(err: any, uri: string) {
        console.error(`POST to ${uri} failed.`);
        if (err && err.status === 409) {
            core.debug(`409: ${err.data.detail}`);
        } else {
            console.log(err);
            if (err & err.toJSON) {
                console.error(err.toJSON());
            } else {
                console.error(JSON.stringify(err));
            }
            if (!this.neverFail) {
                core.setFailed(`POST to ${uri} failed. ${err.status} ${err.code}.`);
            } else {
                console.error(`POST to ${uri} failed. ${err.status} ${err.code}.`);
                console.error(
                    'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
                );
            }
        }
    }
}

export async function uploadChallengeArtifact(
    challenge: ChallengePublishChallenge,
    options: UploadArtifactOptions,
): Promise<ChallengePublishChallenge> {
    const filename = 'ChallengePublishHandshake.txt';
    const rootDirectory = process.cwd();
    try {
        fs.writeFileSync(`${rootDirectory}/${filename}`, challenge.public_message);
        // file written successfully
    } catch (err) {
        console.error(err);
        throw err;
    }

    const artifactName = `ChallengePublishHandshake.${challenge.public_challenge}`;
    const uploadResponse = await artifact.uploadArtifact(artifactName, [filename], rootDirectory, options);

    core.info(
        `Uploaded ${artifactName} . Final size is ${uploadResponse.size} bytes. Artifact ID is ${uploadResponse.id}`,
    );

    // const artifactURL = `${github.context.serverUrl}/${repository.owner}/${repository.repo}/actions/runs/${github.context.runId}/artifacts/${uploadResponse.id}`
    challenge.artifact_id = uploadResponse.id;
    return challenge;
}
