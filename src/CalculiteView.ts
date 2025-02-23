import { IconName, ItemView, Scope, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE = 'calculite';
const DISPLAY_TEXT = 'Calculite';
const ICON = 'lucide-calculator';

// Number formatting
const NUMBER_FORMAT = new Intl.NumberFormat(localStorage.language); // Pre-1.8.7 compatible
const DECIMAL_SYMBOL = NUMBER_FORMAT.format(0.1).toString()[1];

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
const DECIMAL = DECIMAL_SYMBOL;
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

	// Numeric state
	private previousResult: number | null = null;
	private previousOperator: string | null = null;
	private previousInput: number | null = null;
	private currentResult: number | null = null;
	private currentOperator: string | null = null;
	private currentInput: string | null = null;

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

		// Register keyboard shortcuts
		this.registerHotkeys();
	}

	/**
	 * Create a screen for showing input and output.
	 */
	private createScreen(): void {
		this.screenEl = this.contentEl.createDiv({ cls: 'calculite-screen' });
		this.updateScreen(null);
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
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: DIVIDE }, el => {
			this.registerDomEvent(el, 'click', () => this.pressOperator(DIVIDE));
		});

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
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: MULTIPLY }, el => {
			this.registerDomEvent(el, 'click', () => this.pressOperator(MULTIPLY));
		});

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
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: SUBTRACT }, el => {
			this.registerDomEvent(el, 'click', () => this.pressOperator(SUBTRACT));
		});

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
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: ADD }, el => {
			this.registerDomEvent(el, 'click', () => this.pressOperator(ADD));
		});

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
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: EQUALS }, el => {
			this.registerDomEvent(el, 'click', () => this.pressEquals());
		});
	}

	/**
	 * Register keyboard shortcuts for the buttons.
	 */
	private registerHotkeys(): void {
		// Create a hotkey scope
		this.scope = new Scope(this.app.scope);

		// Register simple hotkeys
		this.scope.register([], 'C', () => this.pressClear());
		this.scope.register([], 'Escape', () => this.pressClear());
		this.scope.register([], 'Delete', () => this.pressClearEntry());
		this.scope.register([], 'Backspace', () => this.pressBack());
		this.scope.register([], '0', () => this.pressDigit(0));
		this.scope.register([], '1', () => this.pressDigit(1));
		this.scope.register([], '2', () => this.pressDigit(2));
		this.scope.register([], '3', () => this.pressDigit(3));
		this.scope.register([], '4', () => this.pressDigit(4));
		this.scope.register([], '5', () => this.pressDigit(5));
		this.scope.register([], '6', () => this.pressDigit(6));
		this.scope.register([], '7', () => this.pressDigit(7));
		this.scope.register([], '8', () => this.pressDigit(8));
		this.scope.register([], '9', () => this.pressDigit(9));
		this.scope.register([], DECIMAL_SYMBOL, () => this.pressDecimal());
		this.scope.register([], 'F9', () => this.pressNegate());

		// Register operator hotkeys
		this.scope.register(null, '+', () => this.pressOperator(ADD));
		this.scope.register(null, '-', () => this.pressOperator(SUBTRACT));
		this.scope.register(null, '*', () => this.pressOperator(MULTIPLY));
		this.scope.register(null, '/', () => this.pressOperator(DIVIDE));
		this.scope.register(null, '=', () => this.pressEquals());
		this.scope.register([], 'P', () => this.pressOperator(ADD));
		this.scope.register([], 'O', () => this.pressOperator(SUBTRACT));
		this.scope.register([], 'X', () => this.pressOperator(MULTIPLY));
		this.scope.register([], 'T', () => this.pressOperator(MULTIPLY));
		this.scope.register([], 'Y', () => this.pressOperator(DIVIDE));
		this.scope.register([], 'Enter', () => this.pressEquals());

		// Register combo hotkeys
		this.scope.register(['Shift'], 'Escape', () => this.pressClearEntry());
		this.scope.register(['Shift'], 'Backspace', () => this.pressBack(true));
		this.scope.register(['Alt'], '-', () => this.pressNegate());
	}

	/**
	 * Clear the screen, and reset the equation.
	 */
	private pressClear(): void {
		this.previousResult = null;
		this.previousOperator = null;
		this.previousInput = null;
		this.currentResult = null;
		this.currentOperator = null;
		this.currentInput = null;

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Clear the screen, but continue the equation.
	 */
	private pressClearEntry(): void {
		// If no operator is active, clear all
		if (!this.currentOperator) {
			this.pressClear();
			return;
		}

		this.currentInput = null;

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Delete the last character from the screen.
	 * @param shiftKey If true, delete the first character instead.
	 */
	private pressBack(shiftKey?: boolean): void {
		if (!this.currentInput) {
			return;
		}

		// Remove one character from the input
		this.currentInput = shiftKey
			? this.currentInput.slice(1)
			: this.currentInput.slice(0, -1);

		// Clear input if no digits remains
		if (!this.currentInput || this.currentInput === '-') {
			this.currentInput = null;
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
			// If no operator is active:
			if (!this.currentOperator) {
				this.pressClear();
			}
			this.currentInput = String(digit);
		// If input is not empty:
		} else {
			// If input is zero:
			if (this.currentInput === '0' || this.currentInput === '-0') {
				this.currentInput = this.currentInput.slice(0, -1)
			}
			this.currentInput += digit;
		}

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Append a decimal symbol to the screen.
	 */
	private pressDecimal(): void {
		// If input is empty:
		if (!this.currentInput) {
			// If no operator is active:
			if (!this.currentOperator) {
				this.pressClear();
			}
			this.currentInput = '0.';
		// If input has no decimal point:
		} else if (!this.currentInput.includes('.')) {
			this.currentInput += '.';
		}

		// Update screen
		this.updateScreen(this.currentInput);
	}

	/**
	 * Toggle the input between positive & negative.
	 */
	private pressNegate(): void {
		let output: string;

		// If latest input is a number:
		if (this.currentInput) {
			// If input is negative:
			if (this.currentInput.startsWith('-')) {
				this.currentInput = this.currentInput.slice(1);
			// If input is positive:
			} else {
				this.currentInput = '-' + this.currentInput;
			}
			output = this.currentInput;
		// If an equation is in progress, but no operator is active:
		} else if (this.currentResult !== null && !this.currentOperator) {
			this.currentResult = -this.currentResult;
			output = String(this.currentResult);
		// If input is empty:
		} else {
			this.currentInput = '-0';
			output = this.currentInput;
		}

		// Update screen
		this.updateScreen(output);
	}

	/**
	 * Show the calculated result and continue the equation.
	 * @param operator An operator (ADD, SUBTRACT, MULTIPLY, or DIVIDE).
	 */
	private pressOperator(operator: string): void {
		// Overwrite previous result
		this.previousResult = this.currentResult;

		// If latest input is a number:
		if (this.currentInput) {
			// If an operator is active:
			if (this.currentOperator) {
				this.currentResult = this.calculate(this.currentResult, this.currentOperator, Number(this.currentInput));
			// If no operator is active:
			} else {
				this.currentResult = Number(this.currentInput);
			}
		// If no equation is in progress:
		} else if (this.currentResult === null) {
			this.currentResult = 0;
		}

		// Overwrite previous input & operator
		this.previousInput = Number(this.currentInput);
		if (this.currentOperator) this.previousOperator = this.currentOperator;

		// Update current input & operator
		this.currentInput = null;
		this.currentOperator = operator;

		// Update screen
		this.updateScreen(this.currentResult);
	}

	/**
	 * Show the calculated result.
	 */
	private pressEquals(): void {
		// Overwrite previous result
		this.previousResult = this.currentResult;

		// If an operator is active:
		if (this.currentOperator) {
			this.currentInput ??= String(this.previousResult);
			this.currentResult = this.calculate(this.previousResult, this.currentOperator, Number(this.currentInput));
		// If only a number is entered:
		} else if (this.currentInput) {
			this.currentResult = Number(this.currentInput);
		// If this is a repeated equals press:
		} else if (this.previousInput && this.previousOperator) {
			this.currentResult = this.calculate(this.previousResult, this.previousOperator, this.previousInput);
		// If no equation is in progress:
		} else if (this.currentResult === null) {
			this.currentInput = '0';
			this.currentResult = 0;
		}

		// Overwrite previous input & operator
		if (this.currentInput || this.currentOperator) {
			this.previousInput = Number(this.currentInput);
			this.previousOperator = this.currentOperator;
		}

		// Reset current input & operator
		this.currentOperator = null;
		this.currentInput = null;

		// Update screen
		this.updateScreen(this.currentResult);
	}

	/**
	 * Calculate an equation and return the result.
	 * @param a First number.
	 * @param operator An operator (ADD, SUBTRACT, MULTIPLY, or DIVIDE).
	 * @param b Second number.
	 * @returns Result of the equation.
	 */
	private calculate(a: number | null, operator: string | null, b: number | null): number {
		a ??= 0;
		b ??= 0;
		switch (operator) {
			case ADD: return a + b;
			case SUBTRACT: return a - b;
			case MULTIPLY: return a * b;
			case DIVIDE: return a / b;
			default: return 0;
		}
	}

	/**
	 * Update the screen.
	 * @param output A number or string. Null clears the screen.
	 */
	private updateScreen(output: number | string | null): void {
		if (output === null) {
			output = '0';
		} else {
			// Replace ASCII symbols with typographical symbols
			output = String(output).replace('-', '−').replace('.', DECIMAL_SYMBOL);
		}

		// Output to screen
		this.screenEl.setText(output);
	}
}
