import { Plugin } from 'obsidian';
import { CalculiteView, VIEW_TYPE } from './CalculiteView';

/**
 * Manages the creation of calculator panes.
 */
export default class CalculitePlugin extends Plugin {

	/**
	 * Add commands for the user to summon a calculator.
	 * @override
	 */
	async onload(): Promise<void> {
		// Register the main view
		this.registerView(VIEW_TYPE, (leaf) => new CalculiteView(leaf));

		// RIBBON: Show calculator
		this.addRibbonIcon('calculator', 'Show calculator', () => this.showCalculator());

		// COMMAND: Show calculator
		this.addCommand({
			id: 'show-calculator',
			name: 'Show calculator',
			callback: () => this.showCalculator(),
		});
	}

	/**
	 * Summon a calculator leaf to the foreground.
	 */
	private showCalculator(): void {
		// Check for an existing calculator
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE).first() ?? null;

		if (!leaf) {
			// Open calculator in bottom of right sidebar
			leaf = this.app.workspace.getRightLeaf(true);
			leaf?.setViewState({ type: VIEW_TYPE });
		}

		if (leaf) {
			// Bring calculator to foreground
			this.app.workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Summon a calculator when plugin is enabled.
	 * @override
	 */
	onUserEnable(): void {
		this.showCalculator();
	}
}
