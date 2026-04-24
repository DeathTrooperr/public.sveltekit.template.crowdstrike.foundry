<script lang="ts">
	import { falcon } from '$lib/falcon.svelte';

	// Example queries - in a real app, these might come from an API or manifest
	let queries = $state([
		{
			id: '1',
			name: 'Process Rollup',
			description: 'List recent process execution events',
			query: 'event_simpleName=ProcessRollup2 | limit 100'
		},
		{
			id: '2',
			name: 'Network Connections',
			description: 'List recent network connection events',
			query: 'event_simpleName=NetworkConnect | limit 100'
		},
		{
			id: '3',
			name: 'User Logons',
			description: 'List recent user logon events',
			query: 'event_simpleName=UserLogon | limit 100'
		}
	]);

	let selectedId = $state('1');

	// Find the selected query based on the selectedId
	let selectedQuery = $derived(queries.find((q) => q.id === selectedId));
</script>

<div class="editor-container">
	<!-- Sidebar: Query Selection -->
	<aside class="sidebar">
		<header class="sidebar-header">
			<h2>Saved Queries</h2>
		</header>
		<nav class="query-list">
			{#each queries as q}
				<button
					class="query-item"
					class:active={selectedId === q.id}
					onclick={() => (selectedId = q.id)}
				>
					<span class="query-name">{q.name}</span>
					<span class="query-desc">{q.description}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<!-- Main Area: The Editor -->
	<main class="editor-main">
		{#if selectedQuery}
			<header class="editor-header">
				<div class="header-info">
					<h1>{selectedQuery.name}</h1>
					<p>{selectedQuery.description}</p>
				</div>
				<div class="header-actions">
					<button 
						class="btn-run" 
						onclick={() => console.log('Running query:', selectedQuery?.query)}
					>
						Run Query
					</button>
				</div>
			</header>
			
			<div class="editor-content">
				<!-- 
					Simple textarea editor. In a production app, you might replace this 
					with a Monaco editor or similar for syntax highlighting.
				-->
				<textarea
					bind:value={queries[queries.findIndex(q => q.id === selectedId)].query}
					spellcheck="false"
					placeholder="Enter FQL query here..."
				></textarea>
			</div>
		{:else}
			<div class="no-selection">
				<p>Select a query from the sidebar to begin.</p>
			</div>
		{/if}
	</main>
</div>

<style>
	.editor-container {
		display: flex;
		height: 100%; /* Occupy full height of the parent layout */
		background-color: #1d1c1f;
		color: #e0e0e0;
	}

	.sidebar {
		width: 280px;
		border-right: 1px solid #343337;
		display: flex;
		flex-direction: column;
		background-color: #2b2a2d;
	}

	.sidebar-header {
		padding: 1.25rem;
		border-bottom: 1px solid #343337;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--body-and-labels, #a0a0a0);
	}

	.query-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.query-item {
		width: 100%;
		text-align: left;
		padding: 0.875rem 1rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		transition: all 0.2s;
		margin-bottom: 2px;
	}

	.query-item:hover {
		background-color: #363538;
	}

	.query-item.active {
		background-color: #403f42;
		border-left: 3px solid var(--critical, #cc0000);
		padding-left: calc(1rem - 3px);
	}

	.query-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text-and-icons, #ffffff);
	}

	.query-desc {
		font-size: 0.75rem;
		color: var(--body-and-labels, #a0a0a0);
	}

	.editor-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		background-color: #1d1c1f;
	}

	.editor-header {
		padding: 1rem 1.5rem;
		background-color: #2b2a2d;
		border-bottom: 1px solid #343337;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-info h1 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-and-icons, #ffffff);
	}

	.header-info p {
		margin: 0.125rem 0 0 0;
		font-size: 0.8125rem;
		color: var(--body-and-labels, #a0a0a0);
	}

	.btn-run {
		background-color: var(--critical, #cc0000);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		font-weight: bold;
		font-size: 0.875rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-run:hover {
		background-color: #e60000;
	}

	.editor-content {
		flex: 1;
		position: relative;
	}

	textarea {
		width: 100%;
		height: 100%;
		background-color: transparent;
		color: #d0d0d0;
		border: none;
		padding: 1.5rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.9375rem;
		line-height: 1.6;
		resize: none;
		outline: none;
	}

	.no-selection {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--body-and-labels, #a0a0a0);
		font-style: italic;
	}
</style>
