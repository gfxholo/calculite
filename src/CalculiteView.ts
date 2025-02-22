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
	 * Create the buttons and register their listeners.
	 */
	private createButtons(): void {
		// Create 1st row
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR }, el => {
			this.registerDomEvent(el, 'click', () => this.pressClear());
		});
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR_ENTRY }, el => {
			this.registerDomEvent(el, 'click', () => this.pressClearEntry());
		});
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: BACK }, el => {
			this.registerDomEvent(el, 'click', event => this.pressBack(event.shiftKey));
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: DIVIDE });

		// Create 2nd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_7 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(7));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_8 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(8));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_9 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(9));
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: MULTIPLY });

		// Create 3rd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_4 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(4));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_5 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(5));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_6 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(6));
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: SUBTRACT });

		// Create 4th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_1 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(1));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_2 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(2));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_3 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(3));
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: ADD });

		// Create 5th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: NEGATE }, el => {
			this.registerDomEvent(el, 'click', () => this.pressNegate());
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_0 }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDigit(0));
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DECIMAL }, el => {
			this.registerDomEvent(el, 'click', () => this.pressDecimal());
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: EQUALS });
	}

	/**
	 * Clear the screen.
	 */
	private pressClear(): void {
		this.currentInput = '0';

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Clear the screen.
	 */
	private pressClearEntry(): void {
		this.currentInput = '0';

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Delete the last character from the screen.
	 * @param shiftKey If true, delete the first character instead.
	 */
	private pressBack(shiftKey?: boolean): void {
		// Remove one character from the input
		this.currentInput = shiftKey
			? this.currentInput.slice(1)
			: this.currentInput.slice(0, -1);

		// Clear input if no digits remains
		if (this.currentInput.length === 0) {
			this.currentInput = '0';
		}

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Append a digit to the screen.
	 * @param digit Number from 0-9.
	 */
	private pressDigit(digit: 0|1|2|3|4|5|6|7|8|9): void {
		// If input is empty:
		if (!this.currentInput) {
			this.currentInput = String(digit);
		// If input is not empty:
		} else {
			this.currentInput += digit;
		}

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Append a decimal symbol to the screen.
	 */
	private pressDecimal(): void {
		if (!this.currentInput.includes('.')) {
			this.currentInput += '.';
		}

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Toggle the input between positive & negative.
	 */
	private pressNegate(): void {
		this.currentInput = this.currentInput.startsWith('-')
			? this.currentInput.slice(1)
			: '-' + this.currentInput;

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Update the screen.
	 * @param output A number or string. Null clears the screen.
	 */
	private updateScreen(output: number | string | null): void {
		output = String(output);

		// Display correct minus symbol
		output = output.replace('-', '−');

		// Output to screen
		this.screenEl.setText(output);
	}
}
