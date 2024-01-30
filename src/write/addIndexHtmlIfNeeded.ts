import path from 'path';
import { promises as fs } from 'fs';
import * as core from '@actions/core';
import { DEFAULT_INDEX_HTML } from '../default_index_html';
import * as git from '../git';

export async function addIndexHtmlIfNeeded(additionalGitArguments: string[], dir: string, baseDir: string) {
    const indexHtmlRelativePath = path.join(dir, 'index.html');
    const indexHtmlFullPath = path.join(baseDir, indexHtmlRelativePath);
    try {
        await fs.stat(indexHtmlFullPath);
        core.debug(`Skipped to create default index.html since it is already existing: ${indexHtmlFullPath}`);
        return;
    } catch (_) {
        // Continue
    }

    await fs.writeFile(indexHtmlFullPath, DEFAULT_INDEX_HTML, 'utf8');
    await git.cmd(additionalGitArguments, 'add', indexHtmlRelativePath);
    console.log('Created default index.html at', indexHtmlFullPath);
}
