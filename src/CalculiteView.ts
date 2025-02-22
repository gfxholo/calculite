import { IconName, ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE = 'calculite';
const DISPLAY_TEXT = 'Calculite';
const ICON = 'lucide-calculator';

// Button IDs
const CLEAR = 'C';
const CLEAR_ENTRY = 'CE';
const BACK = '⌫';
const DIGIT_0 = '0';
const DIGIT_1 = '1';
const DIGIT_2 = '2';
const DIGIT_3 = '3';
const DIGIT_4 = '4';
const DIGIT_5 = '5';
const DIGIT_6 = '6';
const DIGIT_7 = '7';
const DIGIT_8 = '8';
const DIGIT_9 = '9';
const DECIMAL = '.';
const NEGATE = '±';
const ADD = '+';
const SUBTRACT = '−';
const MULTIPLY = '×';
const DIVIDE = '÷';
const EQUALS = '=';

/**
 * Presents the visual surface of the calculator.
 */
export class CalculiteView extends ItemView {

	private screenEl: HTMLDivElement;
	private currentInput = '0';

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
		this.contentEl.addClass('calculite');

		// Create UI elements
		this.createScreen();
		this.createButtons();
	}

	/**
	 * Create a screen for showing input and output.
	 */
	private createScreen(): void {
		this.screenEl = this.contentEl.createDiv({ cls: 'calculite-screen', text: this.currentInput });
	}

	/**
	 * Create the buttons.
	 */
	private createButtons(): void {
		// Create 1st row
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR });
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR_ENTRY });
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: BACK });
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: DIVIDE });

		// Create 2nd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_7 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_8 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_9 });
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: MULTIPLY });

		// Create 3rd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_4 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_5 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_6 });
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: ADD });

		// Create 4th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_1 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_2 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_3 });
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: SUBTRACT });

		// Create 5th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: NEGATE });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_0 });
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DECIMAL });
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: EQUALS });
	}
}
