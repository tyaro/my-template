<script lang="ts">
	import { page } from '$app/state';
	import { findItem } from '../data';

	const item = $derived(page.params.id ? findItem(page.params.id) : undefined);
</script>

<p class="note">
	M0スケルトン: M2でスキーマ駆動フォーム（@banto/forms + createFormResource）に置き換わります。
</p>

{#if item}
	<div class="detail">
		<h2>{item.name}</h2>
		<dl>
			<dt>ID</dt>
			<dd>{item.id}</dd>
			<dt>価格</dt>
			<dd>¥{item.price.toLocaleString()}</dd>
			<dt>在庫</dt>
			<dd>{item.stock}</dd>
			<dt>更新日</dt>
			<dd>{item.updatedAt}</dd>
		</dl>
		<a href="/items">← 一覧へ戻る</a>
	</div>
{:else}
	<p>商品が見つかりません。<a href="/items">一覧へ戻る</a></p>
{/if}

<style>
	.note {
		margin: 0 0 1rem;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	.detail {
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
		padding: 1.25rem;
		max-width: 480px;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
	}

	dl {
		display: grid;
		grid-template-columns: 6rem 1fr;
		gap: 0.5rem 1rem;
		margin: 0 0 1rem;
		font-size: 0.875rem;
	}

	dt {
		color: var(--banto-text-muted);
	}

	dd {
		margin: 0;
	}

	a {
		color: var(--banto-primary);
		font-size: 0.875rem;
	}
</style>
