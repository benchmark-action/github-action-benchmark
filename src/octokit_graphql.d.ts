// Workaround for @actions/core until @octokit/graphql v4 is used
declare module '@octokit/graphql' {
    type GraphQlQueryResponse = unknown;
    type Variables = unknown;
}
