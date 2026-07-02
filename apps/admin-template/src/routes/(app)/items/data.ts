/**
 * Sample data for the items CRUD skeleton.
 *
 * Removed in M2 when the page is wired through
 * createListResource → DataProvider → Rust service layer (spec §8.2).
 */
export interface Item {
	id: number;
	name: string;
	price: number;
	stock: number;
	updatedAt: string;
}

export const sampleItems: Item[] = [
	{ id: 1, name: '緑茶 500ml', price: 140, stock: 320, updatedAt: '2026-06-28' },
	{ id: 2, name: 'ほうじ茶 500ml', price: 140, stock: 180, updatedAt: '2026-06-30' },
	{ id: 3, name: '麦茶 2L', price: 250, stock: 96, updatedAt: '2026-07-01' },
	{ id: 4, name: '烏龍茶 500ml', price: 150, stock: 240, updatedAt: '2026-07-01' },
	{ id: 5, name: '抹茶ラテ 240ml', price: 220, stock: 64, updatedAt: '2026-07-02' }
];
