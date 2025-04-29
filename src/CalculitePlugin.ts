import { Platform, Plugin } from 'obsidian';
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

		// COMMAND: Toggle floating calculator
		if (Platform.isDesktopApp && window.activeWindow) { // Skip on app versions below 0.15
			this.addCommand({
				id: 'toggle-floating-calculator',
				name: 'Toggle floating calculator',
				callback: () => this.toggleFloatingCalculator(),
			});
		}
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
	 * Summon a floating calculator window, or dock it into the main window.
	 */
	private toggleFloatingCalculator(): void {
		// Check for an existing calculator
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE).first() ?? null;
		const inMainWindow = leaf?.getContainer() === this.app.workspace.rootSplit.getContainer();

		if (!leaf) {
			// Open calculator in popout window
			leaf = this.app.workspace.openPopoutLeaf();
			leaf.setViewState({ type: VIEW_TYPE });
		} else if (inMainWindow) {
			// Move calculator to popout window
			this.app.workspace.moveLeafToPopout(leaf);
		} else {
			// Move calculator to main window
			const state = leaf.getViewState();
			leaf.detach();
			leaf = this.app.workspace.getRightLeaf(true);
			leaf?.setViewState(state);
			return;
		}

		const popoutWindow = leaf.getContainer().win;
		// @ts-expect-error (Electron API)
		const { electronWindow } = popoutWindow;
		const { documentElement } = popoutWindow.document;

		// Resize window into a golden rectangle
		const width = 247;
		const height = 400;
		popoutWindow.resizeTo(width, height);

		// Move window to a comfortable position
		popoutWindow.moveTo(
			(window.innerWidth / 1.5) - (width / 2), (window.innerHeight / 2) - (height / 2)
		);

		// Set floating window flags
		electronWindow.setAlwaysOnTop(true);
		electronWindow.setMinimizable(false);
		electronWindow.setMaximizable(false);
		electronWindow.setFullScreenable(false);
		
		// Add floating window style
		documentElement.addClass('calculite-floating');
	}

	/**
	 * Summon a calculator when plugin is enabled.
	 * @override
	 */
	onUserEnable(): void {
		this.showCalculator();
	}
}
