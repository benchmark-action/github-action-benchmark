export function isRemoteRejectedError(err: unknown) {
    if (err instanceof Error) {
        return ['[remote rejected]', '[rejected]'].some((l) => err.message.includes(l));
    }
    return false;
}
