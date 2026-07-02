<script lang="ts">
	import { goto } from '$app/navigation';
	import { loginStub } from '$lib/auth';

	let username = $state('');
	let password = $state('');

	function submit(event: SubmitEvent) {
		event.preventDefault();
		// TODO(M2): AuthProvider.login() に置き換える（仕様 §3.3, §8.2）。
		loginStub();
		goto('/dashboard');
	}
</script>

<div class="page">
	<form onsubmit={submit}>
		<h1>🏮 Banto</h1>
		<p class="note">M0スタブ: 任意の値でログインできます</p>

		<label>
			ユーザー名
			<input type="text" bind:value={username} autocomplete="username" />
		</label>

		<label>
			パスワード
			<input type="password" bind:value={password} autocomplete="current-password" />
		</label>

		<button type="submit">ログイン</button>
	</form>
</div>

<style>
	.page {
		min-height: 100vh;
		display: grid;
		place-items: center;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 320px;
		padding: 2rem;
		background: var(--banto-surface);
		border: 1px solid var(--banto-border);
		border-radius: calc(var(--banto-radius) * 2);
	}

	h1 {
		margin: 0;
		text-align: center;
		font-size: 1.5rem;
	}

	.note {
		margin: 0;
		text-align: center;
		color: var(--banto-text-muted);
		font-size: 0.8rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.875rem;
		color: var(--banto-text-muted);
	}

	input {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--banto-border);
		border-radius: var(--banto-radius);
		background: var(--banto-bg);
		color: var(--banto-text);
	}

	input:focus-visible {
		outline: none;
		box-shadow: var(--banto-focus-ring);
	}

	button {
		padding: 0.55rem;
		border: none;
		border-radius: var(--banto-radius);
		background: var(--banto-primary);
		color: var(--banto-text-inverse);
		font-weight: 600;
		cursor: pointer;
	}

	button:hover {
		background: var(--banto-primary-hover);
	}
</style>
