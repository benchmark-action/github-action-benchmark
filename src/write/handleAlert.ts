import { Benchmark } from '../extract';
import { Config } from '../config';
import * as core from '@actions/core';
import { findAlerts } from './findAlerts';
import { buildAlertComment } from './buildAlertComment';
import { leaveComment } from './leaveComment';
import { floatStr } from './markdownUtils';

export async function handleAlert(benchName: string, curSuite: Benchmark, prevSuite: Benchmark, config: Config) {
    const { alertThreshold, githubToken, commentOnAlert, failOnAlert, alertCommentCcUsers, failThreshold } = config;

    if (!commentOnAlert && !failOnAlert) {
        core.debug('Alert check was skipped because both comment-on-alert and fail-on-alert were disabled');
        return;
    }

    const alerts = findAlerts(curSuite, prevSuite, alertThreshold);
    if (alerts.length === 0) {
        core.debug('No performance alert found happily');
        return;
    }

    core.debug(`Found ${alerts.length} alerts`);
    const body = buildAlertComment(alerts, benchName, curSuite, prevSuite, alertThreshold, alertCommentCcUsers);
    let message = body;
    let url = null;

    if (commentOnAlert) {
        if (!githubToken) {
            throw new Error("'comment-on-alert' input is set but 'github-token' input is not set");
        }
        const res = await leaveComment(curSuite.commit.id, body, githubToken);
        url = res.data.html_url;
        message = body + `\nComment was generated at ${url}`;
    }

    if (failOnAlert) {
        // Note: alertThreshold is smaller than failThreshold. It was checked in config.ts
        const len = alerts.length;
        const threshold = floatStr(failThreshold);
        const failures = alerts.filter((a) => a.ratio > failThreshold);
        if (failures.length > 0) {
            core.debug('Mark this workflow as fail since one or more fatal alerts found');
            if (failThreshold !== alertThreshold) {
                // Prepend message that explains how these alerts were detected with different thresholds
                message = `${failures.length} of ${len} alerts exceeded the failure threshold \`${threshold}\` specified by fail-threshold input:\n\n${message}`;
            }
            throw new Error(message);
        } else {
            core.debug(
                `${len} alerts exceeding the alert threshold ${alertThreshold} were found but` +
                    ` all of them did not exceed the failure threshold ${threshold}`,
            );
        }
    }
}
