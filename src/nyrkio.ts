/* eslint @typescript-eslint/naming-convention: 0 */
/* eslint @typescript-eslint/no-non-null-assertion: 0 */
/* eslint no-useless-escape: 0 */

import { Benchmark, BenchmarkResult, Commit, NyrkioJsonPath, NyrkioJson, NyrkioMetrics } from './extract';
import { Config } from './config';
import * as core from '@actions/core';
import axios from 'axios';

export interface NyrkioChangePoint {
    metric: string;
    index: number;
    time: number;
    forward_change_percent: string;
    magnitude: string;
    mean_before: string;
    stddev_before: string;
    mean_after: string;
    stddev_after: string;
    pvalue: string;
}

export interface NyrkioChanges {
    time: number;
    attributes: {
        git_commit: string;
        git_repo: string;
        branch: string;
        commit_msg: string;
        test_name: string;
        concurrency: number;
    };
    changes: NyrkioChangePoint[];
}

export interface NyrkioAllChanges {
    path: string;
    changes: NyrkioChanges[];
}

export function sanitizeForUri(value: string | undefined): string {
    const v: string = value ?? '';
    const re = /[^a-zA-Z0-9-_.\/]/gi;
    const clean = v.replace(re, '_');
    return clean.length <= 50 ? clean : clean.substring(0, 50);
}

export function nyrkioJsonMetricsInit(b: BenchmarkResult): NyrkioMetrics {
    const NYRKIO_JSON_TEMPLATE_METRICS = { name: b.name, unit: b.unit, value: b.value };
    return NYRKIO_JSON_TEMPLATE_METRICS;
}

export function nyrkioJsonInit(commit: Commit, buildTime: number): NyrkioJson {
    let t = buildTime;
    if (commit.timestamp !== undefined) {
        t = convertDateStringToUnixTimestamp(commit.timestamp);
    } else {
        core.warning('No timestamp found in commit. Using build time = when the benchmark was run.');
    }

    const NYRKIO_JSON_TEMPLATE = {
        timestamp: t,
        metrics: [],
        attributes: {
            git_repo: commit.repoUrl,
            branch: commit.branch!,
            git_commit: commit.id,
        },
        extra_info: { build_time: buildTime },
    };
    return NYRKIO_JSON_TEMPLATE;
}

// function convertDateToUnixTimestamp(d: Date) {
//     return d.getTime() / 1000;
// }

function convertDateStringToUnixTimestamp(d: string) {
    return Date.parse(d) / 1000;
}

class NyrkioResultSorter {
    r: Map<string, Map<string, Map<string, NyrkioJson>>>;

    constructor() {
        this.r = new Map<string, Map<string, Map<string, NyrkioJson>>>();
    }

    // TODO: git_commit appears to be redundant
    add(path: string, git_commit: string, result: NyrkioJson) {
        if (result.metrics.length <= 0) return;

        if (this.r.get(path) === undefined) this.r.set(path, new Map<string, Map<string, NyrkioJson>>());
        if (this.r.get(path)!.get(git_commit) === undefined)
            this.r.get(path)!.set(git_commit, new Map<string, NyrkioJson>());
        if (this.r.get(path)!.get(git_commit)!.get(result.timestamp.toString()) === undefined)
            this.r.get(path)!.get(git_commit)!.set(result.timestamp.toString(), result);
        else this.r.get(path)!.get(git_commit)!.get(result.timestamp.toString())!.metrics.concat(result.metrics);
        core.debug(path);
        core.debug(git_commit);
        core.debug(result.timestamp.toString());
    }

    iterator(): [NyrkioJsonPath] | null {
        core.debug(this.r.toString());
        let ret: [NyrkioJsonPath] | null = null;

        for (const k of this.r.keys()) {
            core.debug(k);
            for (const g of this.r.get(k)!.keys()) {
                core.debug(g);
                for (const t of this.r.get(k)!.get(g)!.keys()) {
                    core.debug(t);
                    if (!ret) {
                        ret = [{ path: k, results: [this.r.get(k)!.get(g)!.get(t)!] }];
                    } else {
                        ret.push({ path: k, results: [this.r.get(k)!.get(g)!.get(t)!] });
                    }
                    core.debug(JSON.stringify(this.r.get(k)!.get(g)!.get(t)!, null, 4));
                }
            }
        }
        return ret;
    }
}

function convertBenchmarkToNyrkioJson(bench: Benchmark, config: Config): NyrkioJsonPath[] | null {
    let { name } = config;

    const benches = bench.benches;
    const d = bench.date / 1000; // Only Unix timestamps in Nyrkiö context.
    let nyrkioResult = nyrkioJsonInit(bench.commit, d);
    let testName: string | undefined = '';
    let branch: string | undefined = undefined;
    name = sanitizeForUri(name);
    let nyrkioPath = name;
    const nsrt = new NyrkioResultSorter();
    for (const b of benches) {
        if (testName !== sanitizeForUri(b.testName)) {
            nsrt.add(nyrkioPath, bench.commit.id, nyrkioResult);
            nyrkioResult = nyrkioJsonInit(bench.commit, d);

            testName = sanitizeForUri(b.testName);
            branch = sanitizeForUri(nyrkioResult.attributes.branch);
            core.debug(branch);
            if (testName && testName.length > 0) {
                nyrkioPath = name + '/' + branch + '/' + testName;
            } else {
                nyrkioPath = name;
            }
        }
        const m = nyrkioJsonMetricsInit(b);
        m.value = b.value;
        m.name = b.name;
        m.unit = b.unit;
        nyrkioResult.metrics.push(m);
    }
    nsrt.add(nyrkioPath, bench.commit.id, nyrkioResult);

    return nsrt.iterator();
}

async function setParameters(config: Config) {
    const { nyrkioOrg, nyrkioPvalue, nyrkioThreshold, neverFail, nyrkioToken, nyrkioApiRoot } = config;
    if (nyrkioPvalue === null && nyrkioThreshold === null) return;
    if (nyrkioPvalue === null || nyrkioThreshold === null) {
        core.error('Please set both nyrkio-settings-pvalue and nyrkio-settings-threshold');
        core.error("Don't worry, you can fix this later and then go to nyrkio.com to look at your benchmark results.");
        if (!neverFail) {
            core.setFailed('Please set both nyrkio-pvalue and nyrkio-threshold');
        }
        return;
    }
    console.log(`Set Nyrkiö parameters: nyrkio-pvalue=${nyrkioPvalue} nyrkio-threshold=${nyrkioThreshold}`);
    console.log(`Note: These are global parameters that will be used for all your Nyrkiö test results.`);
    const options = {
        headers: {
            Authorization: 'Bearer ' + (nyrkioToken ? nyrkioToken : ''),
        },
    };
    const configObject = {
        core: { min_magnitude: nyrkioThreshold, max_pvalue: nyrkioPvalue },
    };
    let uri = nyrkioApiRoot + 'user/config';
    if (nyrkioOrg) {
        uri = nyrkioApiRoot + 'orgs/org/' + nyrkioOrg;
    }
    core.debug('POST Nyrkiö config: ' + uri);
    try {
        const response = await axios.post(uri, configObject, options);
        core.debug('Response from user/config or orgs/org: ' + JSON.stringify(response));
    } catch (err: any) {
        console.error(
            `POST to ${uri} failed. I'll still try to post the test results. You can always change the settings later.`,
        );
        if (err && err.status === 409) {
            core.debug(`409: ${err.data.detail}`);
        } else {
            if (err & err.toJSON) {
                console.error(err.toJSON());
            } else {
                console.error(JSON.stringify(err));
            }
            if (!neverFail) {
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
async function setNotifiers(config: Config) {
    const { nyrkioOrg, commentAlways, commentOnAlert, neverFail, nyrkioToken, nyrkioApiRoot } = config;
    console.log(
        `Set Nyrkiö preference for comment on PR: comment-always=${commentAlways} comment-on-alert=${commentOnAlert} => ${
            commentAlways || commentOnAlert
        }`,
    );
    if (commentOnAlert) {
        console.warn('comment-on-alert is not yet supported for Nyrkiö. Will fall back to comment-always.');
    }
    console.log(`Note: These are global parameters that will be used for all your Nyrkiö test results.`);
    const options = {
        headers: {
            Authorization: 'Bearer ' + (nyrkioToken ? nyrkioToken : ''),
        },
    };
    // const configObject = {
    //     notifiers: { github: commentAlways },
    // };
    let uri = nyrkioApiRoot + 'user/config';
    if (nyrkioOrg) {
        uri = nyrkioApiRoot + 'orgs/org/' + nyrkioOrg;
    }
    core.debug('POST Nyrkiö notification config: ' + uri);
    try {
        // Will throw on failure
        const response = await axios.get(uri, options);
        let configObject = response.data;
        if (
            !configObject ||
            (configObject && configObject.notifiers === null) ||
            (configObject && configObject.notifiers === undefined)
        ) {
            configObject = {
                notifiers: { github: true, slack: false, since_days: 14 },
            };
        }
        configObject['notifiers']['github'] = commentAlways || commentOnAlert;
        console.log(configObject);
        const response2 = await axios.post(uri, configObject, options);
        core.debug(response2.data);
    } catch (err: any) {
        console.error(`POST to ${uri} failed. I'll keep trying with rest.`);
        if (err && err.status === 409) {
            core.debug(`409: ${err.data.detail}`);
        } else {
            if (err & err.toJSON) {
                console.error(err.toJSON());
            } else {
                console.error(JSON.stringify(err));
            }
            if (!neverFail) {
                core.setFailed(`POST to ${uri} failed. ${err.status} ${err.code}.`);
            } else {
                console.error(
                    'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
                );
            }
        }
    }
}

export async function postResults(
    allTestResults: NyrkioJsonPath[],
    config: Config,
    commit: Commit,
): Promise<[NyrkioAllChanges] | boolean> {
    await setParameters(config);
    await setNotifiers(config);
    const { name, nyrkioToken, nyrkioApiRoot, nyrkioOrg, neverFail, nyrkioPublic } = config;
    core.debug(nyrkioToken ? nyrkioToken.substring(0, 5) : "WHERE's MY TOKEN???");
    const options = {
        headers: {
            Authorization: `Bearer ${nyrkioToken}`,
        },
    };
    let allChanges: [NyrkioAllChanges] | boolean = false;
    let changes2: [NyrkioAllChanges] | boolean = false;
    const gitRepoBase = 'https://github.com/';
    let gitRepo = gitRepoBase + commit.repo;
    gitRepo = encodeURIComponent(gitRepo);

    for (const r of allTestResults) {
        core.debug(r.path);
        let uri = `${nyrkioApiRoot}result/${r.path}`;
        let testConfigUrl = `${nyrkioApiRoot}config/${r.path}`;
        if (commit.prNumber) {
            uri = `${nyrkioApiRoot}pulls/${commit.repo}/${commit.prNumber}/result/${r.path}`;
        }
        if (nyrkioOrg !== undefined) {
            uri = `${nyrkioApiRoot}orgs/result/${nyrkioOrg}/${r.path}`;
            testConfigUrl = `${nyrkioApiRoot}orgs/config/${nyrkioOrg}/${r.path}`;
            if (commit.prNumber) {
                uri = `${nyrkioApiRoot}orgs/pulls/${commit.repo}/${commit.prNumber}/result/${nyrkioOrg}/${r.path}`;
            }
        }
        try {
            console.log('PUT results: ' + uri);
            // Will throw on failure
            const response = await axios.put(uri, r.results, options);
            if (response.data) {
                const resp = response.data;
                const v = resp[r.path];
                const c: [NyrkioChanges] | [] = <[NyrkioChanges] | []>v;
                if (c === undefined || c.length === 0) {
                    core.debug('No changes');
                } else {
                    // Note: In extreme cases Nyrkiö might alert immediately after you committed a regression.
                    // However, in most cases you'll get a separate alert a few days later, once the statistical
                    // significance accumulates.
                    for (const changePoint of c) {
                        if (changePoint.attributes.git_commit === commit.id) {
                            const cc: NyrkioAllChanges = { path: r.path, changes: c };
                            if (allChanges === false) allChanges = [cc];
                            else allChanges.push(cc);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error(`PUT to ${uri} failed. I'll keep trying with the others though.`);
            if (err & err.toJSON) {
                console.error(err.toJSON());
            } else {
                console.error(err);
            }
            if (!neverFail) {
                core.setFailed(`PUT to ${uri} failed. ${err.status} ${err.code}.`);
            } else {
                console.error(
                    'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
                );
            }
        }
        console.log(nyrkioPublic);
        try {
            if (nyrkioPublic) {
                core.debug(`Make ${r.path} public.`);
                const docs = [{ public: true, attributes: { git_repo: commit.repo, branch: commit.branch } }];
                const response = await axios.post(testConfigUrl, docs, options);
                if (response.data) {
                    core.debug(JSON.stringify(response.data));
                }
            }
        } catch (err: any) {
            if (err && err.status === 409) {
                core.debug(`409: ${err.data?.detail}`);
            } else {
                console.error(`POST to ${testConfigUrl} failed. I'll keep trying with the others though.`);
                if (err & err.toJSON) {
                    console.error(err.toJSON());
                } else {
                    console.error(err);
                }
                if (!neverFail) {
                    core.setFailed(`POST to ${testConfigUrl} failed. ${err.status} ${err.code}.`);
                } else {
                    console.error(
                        'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
                    );
                }
            }
        }
    }

    if (commit.prNumber) {
        changes2 = await getChangesAndNotify(config, commit, options);
    }
    const html_url_base = nyrkioApiRoot.split('/api/')[0];
    let html_url = `${html_url_base}/tests/${name}`;
    if (nyrkioPublic) {
        html_url = `${html_url_base}/public/${gitRepo}/${commit.branch}/${name}`;
    }
    console.log('------');
    console.log('Your test results can now be analyzed at:');
    console.log(html_url);
    console.debug(allChanges);
    return changes2;
}
async function getChangesAndNotify(
    config: Config,
    commit: Commit,
    httpOptions: object,
): Promise<[NyrkioAllChanges] | boolean> {
    const repo = commit.repo;
    const pull_number = commit.prNumber;
    const middle = `/pulls/${repo}/${pull_number}/changes/${commit.id}`;
    const { nyrkioApiRoot, commentAlways, commentOnAlert, neverFail } = config;
    const notify: boolean = commentAlways || commentOnAlert;
    const q = notify ? '?notify=1' : '';
    const uri = nyrkioApiRoot + middle + q;
    let allChanges: [NyrkioAllChanges] | boolean = false;

    try {
        console.log('Get all changes and notify if configured: ' + uri);
        const response = await axios.get(uri, httpOptions);

        if (response.data) {
            console.debug(typeof response.data);
            const list_of_all_changes_per_test: Array<object> = response.data;

            list_of_all_changes_per_test.forEach((test_name_and_changes_obj) => {
                console.debug(test_name_and_changes_obj);
                console.debug(typeof test_name_and_changes_obj);
                for (const [test_name, changes] of Object.entries(test_name_and_changes_obj)) {
                    const cpList: NyrkioChanges[] = changes;
                    console.debug(test_name);
                    console.debug(cpList);

                    if (cpList === undefined || cpList.length === 0) {
                        core.debug('No changes for ' + test_name);
                    } else {
                        // Note: In extreme cases Nyrkiö might alert immediately after you committed a regression.
                        // However, in most cases you'll get a separate alert a few days later, once the statistical
                        // significance accumulates.
                        // console.log(c);
                        for (const changePoint of cpList.values()) {
                            console.debug(changePoint);
                            if (changePoint.attributes && changePoint.attributes.git_commit === commit.id) {
                                const cc: NyrkioAllChanges = { path: test_name, changes: [changePoint] };
                                if (allChanges === false) allChanges = [cc];
                                else {
                                    const acTypeList: [NyrkioAllChanges] = <[NyrkioAllChanges]>allChanges;
                                    acTypeList.push(cc);
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (err: any) {
        console.error(`GET to ${uri} failed.`);
        if (err & err.toJSON) {
            console.error(err.toJSON());
        } else {
            console.error(err);
        }
        if (!neverFail) {
            core.setFailed(`GET to ${uri} failed. ${err.status} ${err.code} ${err}.`);
        } else {
            console.error(
                'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
            );
        }
    }
    return allChanges;
}
export async function nyrkioFindChanges(b: Benchmark, config: Config) {
    const { nyrkioEnable, failOnAlert, neverFail } = config;
    core.debug('nyrkio-enable=' + nyrkioEnable.toString());
    if (!nyrkioEnable) return;

    const allTestResults = convertBenchmarkToNyrkioJson(b, config);
    core.debug(JSON.stringify(allTestResults));
    if (allTestResults === null) return;

    const changes = await postResults(allTestResults, config, b.commit);
    if (changes && failOnAlert) {
        console.error(
            '\n\nNyrkiö detected a change in your performance test results. Please see the log for details.\n',
        );
        console.error(JSON.stringify(changes, null, 4));
        if (!neverFail) {
            core.setFailed(
                'Nyrkiö detected a change in your performance test results. Please see the log for details.',
            );
        } else {
            console.error(
                'Note: never-fail is true. Ignoring this error and continuing. Will exit successfully to keep the build green.',
            );
        }
    } else {
        console.log(
            "Nyrkiö didn't find any changes now. But you should check again in a week or so, smaller changes are detected with a delay to avoid false positives.",
        );
    }
    return;
}
