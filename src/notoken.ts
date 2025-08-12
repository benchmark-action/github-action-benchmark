/* eslint @typescript-eslint/naming-convention: 0 */
/* eslint @typescript-eslint/no-non-null-assertion: 0 */
/* eslint no-useless-escape: 0 */

/* Challenge Publish Handshake auth for GitHub Workflows
 *
 * We want to allow any logged in Github user use Nyrkiö with zero effort needed to subscribe or register to anything.
 *
 * At the start of a GitHub action, the action code running at github.com initiates a handshake protocol with
 * nyrkio.com. It claims to be a certain github username. The nyrkio.com side verifies that such a workflow is
 * currently running and was triggered by the given username. nyrkio.com then returns  a random string to the action.
 * When the action prints this challenge into its log, this is observed by the nyrkio.com side. This proves that
 * the connection was indeed iniitiated by the code running that specific workflow, triggered by the github user
 * that is associated with the workflow run in numerous json files returned by github.
 *
 *
 * (c) 2025 Nyrkiö Oy / Henrik Ingo
 *
 * MIT licensed as everything else in this repo...
 */

import * as github from '@actions/github';
import * as core from '@actions/core';

import { Config } from './config';
import { NyrkioClient, ChallengePublishClaim, ChallengePublishChallenge } from './nyrkioClient';

function isPr(): boolean {
    // if(github.context.payload.pull_request) return true;
    if (github.context.eventName === 'pull_request') return true;
    return false;
}

function getPr(): object {
    core.debug(JSON.stringify(github.context));
    return github.context;
}

function isPush(): boolean {
    if (github.context.eventName === 'push') return true;
    return false;
}

function getPush(): object {
    core.debug(JSON.stringify(github.context));
    return github.context;
}

export async function challengePublishHandshake(config: Config): Promise<string | null> {
    const client = new NyrkioClient(config);
    try {
        const me = getGithubContext();
        core.debug('111');
        const challenge: ChallengePublishChallenge | undefined = await client.challengePublishHandshakeClaim(me);

        if (challenge === undefined) return null;

        // console.log(challenge.public_message);
        const jwt = await client.challengePublishHandshakeComplete(challenge);
        if (jwt) return jwt;
        console.warn("Shouldn't happen: No error but you're also not logged in properly.");
    } catch (err: any) {
        if (!client.neverFail) {
            core.setFailed('ChallengePublishHandshake betweeń Github and Nyrkiö failed...');
        } else {
            console.error('ChallengePublishHandshake betweeń Github and Nyrkiö failed...');
            console.error(
                'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
            );
        }
        if (err & err.toJSON) {
            console.error(err.toJSON());
        } else {
            console.error(JSON.stringify(err));
        }
    }
    return null;
}

function generateSecret(): string {
    const a = Math.random();
    const b = Math.random();
    return `ChallengePublishHandshake-client_secret-${a}${b}`;
}

function getGithubContext(): ChallengePublishClaim {
    if (isPr()) {
        core.debug("We're a `pull_request`");
        core.debug(JSON.stringify(github.context));
        core.debug('1');
        const username = github.context.actor;
        core.debug('2');
        const client_secret = generateSecret();
        core.debug('3');
        const repo_owner = github.context.payload.repository?.owner?.login;
        core.debug('4');
        const repo_name = github.context.payload.repository?.name;
        core.debug('5');
        const workflow_name = github.context.workflow;
        core.debug('6');
        const event_name = github.context.eventName;
        core.debug('7');
        const run_number = github.context.runNumber;
        core.debug('8');
        const run_id = github.context.runId;
        core.debug('9');
        return {
            username: username,
            client_secret: client_secret,
            repo_owner: repo_owner ? repo_owner : '',
            repo_name: repo_name ? repo_name : '',
            workflow_name: workflow_name,
            event_name: event_name,
            run_number: run_number,
            run_id: run_id,
        };
        // return {
        //     username: github.context.actor,
        //     client_secret: generateSecret(),
        //     repo_owner: github.context.payload.pull_request!.repository.owner.login,
        //     repo_name: github.context.payload.pull_request!.repository.name,
        //     workflow_name: github.context.workflow,
        //     event_name: github.context.eventName,
        //     run_number: github.context.runNumber,
        //     run_id: github.context.runId,
        // };
    }
    if (isPush()) {
        // const repo_name = github.context.payload.repository?.split('/')[1];
        // const repo_owner = github.context.payload.repository?.owner.login;
        // const authData: ChallengePublishClaim = {
        //     username: repo_owner,
        //     client_secret: generateSecret(),
        //     repo_owner: repo_owner,
        //     repo_name: repo_name,
        //     workflow_name: github.context.workflow!,
        //     event_name: github.context.eventName!,
        //     run_number: github.context.runNumber!,
        //     run_id: github.context.runId!,
        // };
        // if (repo_owner === github.context.payload.push.event.commits![0].committer.username!) {
        //     authData.repo_owner_email = github.context.payload.push.event.commits![0].committer.email!;
        //     authData.repo_owner_full_name = github.context.payload.push.event.commits![0].committer.name!;
        // }
        // return authData;
    }
    getPr(); // Just for debug
    getPush(); // Just for debug
    throw new Error(
        'Only `push` and `pull_request` events are supported by this github action. Specifically, by the ChallengePublishHandshake.',
    );
}
