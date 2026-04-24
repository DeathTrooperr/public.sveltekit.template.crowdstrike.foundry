import adapter from 'adapter-foundry';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
    },
    kit: {
        adapter: adapter(),

        router: {
            // Hash routing is required for the Foundry iframe sandbox. Foundry
            // controls the URL pathname and query parameters (UUID and path),
            // so SvelteKit must own only the hash fragment for its routing.
            type: 'hash',
        },
    },
};

export default config;