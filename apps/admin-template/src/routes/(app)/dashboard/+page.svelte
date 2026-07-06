<div class="cards">
	<section class="card">
		<h2>チャート</h2>
		<p>M4で @banto/charts のダッシュボードが入ります。</p>
	</section>
	<section class="card">
		<h2>グリッド</h2>
		<p>M1で @banto/grid-svelte の一覧が入ります。</p>
	</section>
	<section class="card wide">
		<h2>ドッキングレイアウト</h2>
		<p>M6-M7で @banto/dock-svelte によるパネル分割・タブ化・レイアウト保存のデモが入ります。</p>
	</section>
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.card {
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		padding: 1rem 1.25rem;
	}

	.card.wide {
		grid-column: 1 / -1;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	p {
		margin: 0;
		color: var(--banto-text-muted);
		font-size: 0.875rem;
	}
</style>
