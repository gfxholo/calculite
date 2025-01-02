import { IconName, ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE = 'calculite';
const DISPLAY_TEXT = 'Calculite';
const ICON = 'lucide-calculator';

/**
 * Presents the visual surface of the calculator.
 */
export class CalculiteView extends ItemView {

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	/**
	 * @returns The ID of this view, used by Workspace methods.
	 * @override
	 */
	getViewType(): string {
		return VIEW_TYPE;
	}

	/**
	 * @returns The human-readable name of this view.
	 * @override
	 */
	getDisplayText(): string {
		return DISPLAY_TEXT;
	}

	/**
	 * @returns The icon ID used by tabs containing this view.
	 * @override
	 */
	getIcon(): IconName {
		return ICON;
	}

	/**
	 * Initialize the view.
	 * @override
	 */
	async onOpen(): Promise<void> {
		this.contentEl.empty();
	}
}
