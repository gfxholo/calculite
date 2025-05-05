import { IconName, ItemView, Menu, Platform, Scope, ViewStateResult, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE = 'calculite';
const DISPLAY_TEXT = 'Calculite';
const ICON = 'lucide-calculator';

// Number formatting
const MAX_DIGITS = 30;
const NUMBER_FORMAT = new Intl.NumberFormat(localStorage.language); // Pre-1.8.7 compatible
const GROUPING_SYMBOL = NUMBER_FORMAT.format(1000).toString()[1];
const DECIMAL_SYMBOL = NUMBER_FORMAT.format(0.1).toString()[1];
const NON_NUMERIC_CHARS = new RegExp('[^-0-9' + DECIMAL_SYMBOL + ']', 'g');

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

	// Screens
	private subscreenEl: HTMLDivElement;
	private screenEl: HTMLDivElement;
	private canvasCtx: CanvasRenderingContext2D | null;

	// Numeric state
	private previousResult: number | null = null;
	private previousOperator: string | null = null;
	private previousInput: number | null = null;
	private currentResult: number | null = null;
	private currentOperator: string | null = null;
	private currentInput: string | null = null;
	private currentError: string | null = null;

	// Button state
	private currentClickTarget: EventTarget | null = null;
	private currentTouchTimerId: number | undefined;
	private hotkeyButtonMap: Map<string | number, HTMLButtonElement> = new Map();
	private currentHotkeyButtonId: string | null = null;
	private currentHotkeyTimerId: number | undefined;

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
		this.createScreens();
		this.createButtons();

		// Register keyboard shortcuts
		this.registerHotkeys();

		// Initialize font scaling
		this.onResize();
	}

	/**
	 * Preserve view state when the workspace is saved.
	 * @returns A custom state object.
	 * @override
	 */
	getState(): Record<string, unknown> {
		return {
			previousResult: this.previousResult,
			previousOperator: this.previousOperator,
			previousInput: this.previousInput,
			currentResult: this.currentResult,
			currentOperator: this.currentOperator,
			currentInput: this.currentInput,
			currentError: this.currentError,
		}
	}

	/**
	 * Restore view state when the workspace is loaded.
	 * @param state A custom state object.
	 * @param result Not used.
	 * @override
	 */
	setState(state: any, result: ViewStateResult): Promise<void> {
		if (state === null || typeof state !== 'object') {
			state = {};
		}

		// Restore numeric state
		this.previousResult = state.previousResult ?? null;
		this.previousOperator = state.previousOperator ?? null;
		this.previousInput = state.previousInput ?? null;
		this.currentResult = state.currentResult ?? null;
		this.currentOperator = state.currentOperator ?? null;
		this.currentInput = state.currentInput ?? null;

		// Restore both screens
		if (this.currentOperator) {
			this.updateSubscreen([this.currentResult, this.currentOperator]);
		} else if (this.previousOperator) {
			this.updateSubscreen([this.previousResult, this.previousOperator, this.previousInput, '=']);
		} else if (this.previousInput !== null) {
			this.updateSubscreen([this.previousInput, '=']);
		}
		this.updateScreen(this.currentError ?? this.currentInput ?? this.currentResult, this.currentError !== null);

		// Forward to superclass
		return super.setState(state, result);
	}

	/**
	 * Scale font size based on calculator dimensions.
	 * @override
	 */
	onResize(): void {
		// Find the dimension closest to a vertical golden rectangle
		const dimension = Math.min(this.contentEl.clientHeight, this.contentEl.clientWidth * 1.618);

		// Set a divisor that converts length into a font size
		const divisor = Platform.isMobile ? 35 : 25;

		// Update font size
		const fontSize = Math.max(8, dimension / divisor);
		this.contentEl.style.fontSize = fontSize + 'px';

		// Prevent screen overflow
		this.condenseScreen(this.subscreenEl);
		this.condenseScreen(this.screenEl);
	}

	/**
	 * Create two screens for showing input and output.
	 */
	private createScreens(): void {
		// Create both screens
		this.subscreenEl = this.contentEl.createDiv({ cls: 'calculite-subscreen' });
		this.screenEl = this.contentEl.createDiv({ cls: 'calculite-screen' });
		this.updateSubscreen(null);
		this.updateScreen(null);

		// Create a canvas context for measuring screen width
		this.canvasCtx = document.createElement('canvas').getContext('2d');

		// Watch both screens for changes
		const observer = new MutationObserver(records => {
			for (const record of records) {
				if (record.target instanceof HTMLDivElement) {
					this.condenseScreen(record.target);
				}
			}
		});
		observer.observe(this.subscreenEl, { childList: true });
		observer.observe(this.screenEl, { childList: true });

		// Watch theme for changes
		this.app.workspace.on('css-change', () => {
			this.condenseScreen(this.subscreenEl);
			this.condenseScreen(this.screenEl);
		});

		// Register copy listener (Ctrl+C)
		this.registerDomEvent(this.containerEl, 'copy', event => {
			if (this.getScreenSelection(this.subscreenEl)) {
				this.copyScreen(this.subscreenEl, event);
			} else {
				this.copyScreen(this.screenEl, event);
			}
		});

		// Register paste listener (Ctrl+V)
		this.registerDomEvent(this.containerEl, 'paste', event => {
			this.pasteScreen(event);
		});

		// Register menu & animation listeners
		this.registerScreenListeners(this.subscreenEl);
		this.registerScreenListeners(this.screenEl);
	}

	/**
	 * Set up menu & animation listeners on a given screen.
	 * @param screenEl Any screen element.
	 */
	private registerScreenListeners(screenEl: HTMLDivElement): void {
		// Register menu listener
		this.registerDomEvent(screenEl, 'contextmenu', event => {
			event.preventDefault();

			// @ts-expect-error (Pre-0.14.3 compatible)
			const menu = new Menu(this.app);

			// ITEM: Copy
			menu.addItem(menuItem => menuItem
				.setTitle(this.getScreenSelection(screenEl) ? 'Copy selection' : 'Copy')
				.setIcon('lucide-copy')
				.onClick(() => this.copyScreen(screenEl))
			);

			// ITEM: Paste
			if (screenEl === this.screenEl) {
				menu.addItem(menuItem => menuItem
					.setTitle('Paste')
					.setIcon('lucide-clipboard-check')
					.onClick(() => this.pasteScreen())
				);
			}

			// ITEM: Select all
			menu.addItem(menuItem => menuItem
				.setTitle('Select all')
				.setIcon('lucide-box-select')
				.onClick(() => this.selectScreen(screenEl))
			);

			menu.showAtMouseEvent(event);
		});

		// Register animation listener
		this.registerDomEvent(screenEl, 'animationend', event => {
			switch (event.animationName) {
				// Remove animation class after motion stops
				case 'copied': screenEl.removeClass('calculite-copied'); break;
				case 'pasted': screenEl.removeClass('calculite-pasted'); break;
			}
		});
	}

	/**
	 * Create the buttons and register their listeners.
	 */
	private createButtons(): void {
		// Create 1st row
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR }, el => {
			this.registerButtonListeners(el, () => this.pressClear());
			this.hotkeyButtonMap.set(CLEAR, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: CLEAR_ENTRY }, el => {
			this.registerButtonListeners(el, () => this.pressClearEntry());
			this.hotkeyButtonMap.set(CLEAR_ENTRY, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-delete', text: BACK }, el => {
			this.registerButtonListeners(el, event => this.pressBack(event.shiftKey));
			this.hotkeyButtonMap.set(BACK, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: DIVIDE }, el => {
			this.registerButtonListeners(el, () => this.pressOperator(DIVIDE));
			this.hotkeyButtonMap.set(DIVIDE, el);
		});

		// Create 2nd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_7 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(7));
			this.hotkeyButtonMap.set(DIGIT_7, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_8 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(8));
			this.hotkeyButtonMap.set(DIGIT_8, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_9 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(9));
			this.hotkeyButtonMap.set(DIGIT_9, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: MULTIPLY }, el => {
			this.registerButtonListeners(el, () => this.pressOperator(MULTIPLY));
			this.hotkeyButtonMap.set(MULTIPLY, el);
		});

		// Create 3rd row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_4 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(4));
			this.hotkeyButtonMap.set(DIGIT_4, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_5 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(5));
			this.hotkeyButtonMap.set(DIGIT_5, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_6 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(6));
			this.hotkeyButtonMap.set(DIGIT_6, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: SUBTRACT }, el => {
			this.registerButtonListeners(el, () => this.pressOperator(SUBTRACT));
			this.hotkeyButtonMap.set(SUBTRACT, el);
		});

		// Create 4th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_1 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(1));
			this.hotkeyButtonMap.set(DIGIT_1, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_2 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(2));
			this.hotkeyButtonMap.set(DIGIT_2, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_3 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(3));
			this.hotkeyButtonMap.set(DIGIT_3, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: ADD }, el => {
			this.registerButtonListeners(el, () => this.pressOperator(ADD));
			this.hotkeyButtonMap.set(ADD, el);
		});

		// Create 5th row
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: NEGATE }, el => {
			this.registerButtonListeners(el, () => this.pressNegate());
			this.hotkeyButtonMap.set(NEGATE, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DIGIT_0 }, el => {
			this.registerButtonListeners(el, () => this.pressDigit(0));
			this.hotkeyButtonMap.set(DIGIT_0, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-numeric', text: DECIMAL }, el => {
			this.registerButtonListeners(el, () => this.pressDecimal());
			this.hotkeyButtonMap.set(DECIMAL, el);
		});
		this.contentEl.createEl('button', { cls: 'calculite-operator', text: EQUALS }, el => {
			this.registerButtonListeners(el, () => this.pressEquals());
			this.hotkeyButtonMap.set(EQUALS, el);
		});
	}

	/**
	 * Register mouse & touch listeners on a button.
	 */
	private registerButtonListeners(buttonEl: HTMLButtonElement, onPress: (event: PointerEvent) => any): void {
		// Simulate keyboard-repeat on touchscreens
		const touchRepeater = (event: PointerEvent) => {
			this.currentTouchTimerId = window.setInterval(() => {
				if (Platform.isMobile) {
					// @ts-expect-error (Private API)
					const drawerEl = this.leaf.parent.containerEl;
					// If drawer is sliding shut, stop the repeater
					if (drawerEl instanceof HTMLElement && drawerEl.style.transform.includes('translateX')) {
						window.clearTimeout(this.currentTouchTimerId);
						return;
					}
				}
				window.navigator.vibrate(100);
				// If onPress stops returning true, stop the repeater
				if (onPress(event) !== true) {
					window.clearTimeout(this.currentTouchTimerId);
				}
			}, 50);
		}

		// Register button-press listener
		this.registerDomEvent(buttonEl, 'pointerdown', event => {
			if (event.pointerType === 'mouse') {
				// Prepare for click-release
				this.currentClickTarget = event.target;
			} else if (event.pointerType === 'touch') {
				window.navigator.vibrate(100);
				window.clearTimeout(this.currentTouchTimerId);
				// If onPress returns true, continue repeating button while held
				if (onPress(event) === true) {
					this.currentTouchTimerId = window.setTimeout(() => touchRepeater(event), 300);
				}
			}
		});

		// Register button-release listeners
		this.registerDomEvent(buttonEl, 'pointerup', event => {
			// If a clicked button is unclicked, activate it
			if (event.pointerType === 'mouse' && event.target === this.currentClickTarget) {
				onPress(event);
				this.currentClickTarget = null;
			// If a touch is lifted, stop any repeaters
			} else if (event.pointerType === 'touch') {
				window.clearTimeout(this.currentTouchTimerId);
			}
		});
		this.registerDomEvent(buttonEl, 'touchend', () => {
			window.clearTimeout(this.currentTouchTimerId);
		});
		this.registerDomEvent(buttonEl, 'touchcancel', () => {
			window.clearTimeout(this.currentTouchTimerId);
		});
	}

	/**
	 * Register keyboard shortcuts for the buttons.
	 */
	private registerHotkeys(): void {
		// Create a hotkey scope
		this.scope = new Scope(this.app.scope);

		// Register simple hotkeys
		this.scope.register([], 'C', () => {
			this.pressClear();
			this.flashHotkeyButton(CLEAR);
		});
		this.scope.register([], 'Escape', () => {
			this.pressClear();
			this.flashHotkeyButton(CLEAR);
		});
		this.scope.register([], 'Delete', () => {
			this.pressClearEntry();
			this.flashHotkeyButton(CLEAR_ENTRY);
		});
		this.scope.register([], 'Backspace', () => {
			this.pressBack();
			this.flashHotkeyButton(BACK);
		});
		this.scope.register([], '0', () => {
			this.pressDigit(0);
			this.flashHotkeyButton(DIGIT_0);
		});
		this.scope.register([], '1', () => {
			this.pressDigit(1);
			this.flashHotkeyButton(DIGIT_1);
		});
		this.scope.register([], '2', () => {
			this.pressDigit(2);
			this.flashHotkeyButton(DIGIT_2);
		});
		this.scope.register([], '3', () => {
			this.pressDigit(3);
			this.flashHotkeyButton(DIGIT_3);
		});
		this.scope.register([], '4', () => {
			this.pressDigit(4);
			this.flashHotkeyButton(DIGIT_4);
		});
		this.scope.register([], '5', () => {
			this.pressDigit(5);
			this.flashHotkeyButton(DIGIT_5);
		});
		this.scope.register([], '6', () => {
			this.pressDigit(6);
			this.flashHotkeyButton(DIGIT_6);
		});
		this.scope.register([], '7', () => {
			this.pressDigit(7);
			this.flashHotkeyButton(DIGIT_7);
		});
		this.scope.register([], '8', () => {
			this.pressDigit(8);
			this.flashHotkeyButton(DIGIT_8);
		});
		this.scope.register([], '9', () => {
			this.pressDigit(9);
			this.flashHotkeyButton(DIGIT_9);
		});
		this.scope.register([], DECIMAL_SYMBOL, () => {
			this.pressDecimal();
			this.flashHotkeyButton(DECIMAL);
		});
		this.scope.register([], 'F9', () => {
			this.pressNegate();
			this.flashHotkeyButton(NEGATE);
		});

		// Register operator hotkeys
		this.scope.register(null, '+', () => {
			this.pressOperator(ADD);
			this.flashHotkeyButton(ADD);
		});
		this.scope.register(null, '-', () => {
			this.pressOperator(SUBTRACT);
			this.flashHotkeyButton(SUBTRACT);
		});
		this.scope.register(null, '*', () => {
			this.pressOperator(MULTIPLY);
			this.flashHotkeyButton(MULTIPLY);
		});
		this.scope.register(null, '/', () => {
			this.pressOperator(DIVIDE);
			this.flashHotkeyButton(DIVIDE);
		});
		this.scope.register(null, '=', () => {
			this.pressEquals();
			this.flashHotkeyButton(EQUALS);
		});
		this.scope.register([], 'P', () => {
			this.pressOperator(ADD);
			this.flashHotkeyButton(ADD);
		});
		this.scope.register([], 'O', () => {
			this.pressOperator(SUBTRACT);
			this.flashHotkeyButton(SUBTRACT);
		});
		this.scope.register([], 'X', () => {
			this.pressOperator(MULTIPLY);
			this.flashHotkeyButton(MULTIPLY);
		});
		this.scope.register([], 'T', () => {
			this.pressOperator(MULTIPLY);
			this.flashHotkeyButton(MULTIPLY);
		});
		this.scope.register([], 'Y', () => {
			this.pressOperator(DIVIDE);
			this.flashHotkeyButton(DIVIDE);
		});
		this.scope.register([], 'Enter', () => {
			this.pressEquals();
			this.flashHotkeyButton(EQUALS);
		});

		// Register combo hotkeys
		this.scope.register(['Shift'], 'Escape', () => {
			this.pressClearEntry();
			this.flashHotkeyButton(CLEAR_ENTRY);
		});
		this.scope.register(['Shift'], 'Backspace', () => {
			this.pressBack(true);
			this.flashHotkeyButton(BACK);
		});
		this.scope.register(['Alt'], '-', () => {
			this.pressNegate();
			this.flashHotkeyButton(NEGATE);
		});
	}

	/**
	 * Flash a button in response to a pressed hotkey.
	 * @param buttonId ID of a calculator button.
	 */
	private flashHotkeyButton(buttonId: string): void {
		if (this.currentHotkeyTimerId) {
			// Interrupt any previous hotkey timer
			window.clearTimeout(this.currentHotkeyTimerId);
			this.currentHotkeyTimerId = undefined;
			if (this.currentHotkeyButtonId && this.currentHotkeyButtonId !== buttonId) {
				// Interrupt any previous flashing button
				const hotkeyButtonEl = this.hotkeyButtonMap.get(this.currentHotkeyButtonId);
				hotkeyButtonEl?.removeClass('calculite-hotkey-pressed');
			}
		}

		// Flash button by applying a style
		const buttonEl = this.hotkeyButtonMap.get(buttonId);
		buttonEl?.addClass('calculite-hotkey-pressed');

		// Unflash button after 150ms
		this.currentHotkeyButtonId = buttonId;
		this.currentHotkeyTimerId = window.setTimeout(() => {
			buttonEl?.removeClass('calculite-hotkey-pressed');
			this.currentHotkeyTimerId = undefined;
		}, 150);
	}

	/**
	 * Clear the main screen, and reset the equation.
	 */
	private pressClear(): void {
		this.previousResult = null;
		this.previousOperator = null;
		this.previousInput = null;
		this.currentResult = null;
		this.currentOperator = null;
		this.currentInput = null;
		this.currentError = null;

		// Update both screens
		this.updateSubscreen(null);
		this.updateScreen(this.currentInput);
	}

	/**
	 * Clear the main screen, but continue the equation.
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
	 * Delete the last character from the main screen.
	 * @param shiftKey If true, delete the first character instead.
	 * @returns True if back can be repeated.
	 */
	private pressBack(shiftKey?: boolean): boolean {
		if (this.currentError) {
			this.pressClear();
			return false;
		} else if (!this.currentInput) {
			return false;
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

		// Check whether any characters are left
		return this.currentInput !== null;
	}

	/**
	 * Append a digit to the main screen.
	 * @param digit Number from 0-9.
	 * @returns True if digit can be repeated.
	 */
	private pressDigit(digit: 0|1|2|3|4|5|6|7|8|9): boolean {
		// If input is empty:
		if (!this.currentInput) {
			// If no operator is active:
			if (!this.currentOperator) {
				this.pressClear();
			}
			this.currentInput = String(digit);
		// If input cannot hold any more digits:
		} else if (this.countDigits(this.currentInput) >= MAX_DIGITS) {
			return false;
		// If input has space for another digit:
		} else {
			// If input is zero:
			if (this.currentInput === '0' || this.currentInput === '-0') {
				this.currentInput = this.currentInput.slice(0, -1)
			}
			this.currentInput += digit;
		}

		// Update screen
		this.updateScreen(this.currentInput);

		// Check whether input can hold any more digits
		return this.countDigits(this.currentInput) < MAX_DIGITS;
	}

	/**
	 * Append a decimal symbol to the main screen.
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
		if (this.currentError) {
			this.pressClear();
		}

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
		if (this.currentError) {
			return;
		}

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

		// Check for arithmetic errors
		if (this.isDividingByZero() || this.isTooSmall() || this.isTooLarge()) {
			return;
		}

		// Update current input & operator
		this.currentInput = null;
		this.currentOperator = operator;

		// Update both screens
		this.updateSubscreen([this.currentResult, this.currentOperator]);
		this.updateScreen(this.currentResult);
	}

	/**
	 * Show the calculated result.
	 * @returns True if equals can be repeated.
	 */
	private pressEquals(): boolean {
		if (this.currentError) {
			return false;
		}

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

		// Check for arithmetic errors
		if (this.isDividingByZero() || this.isTooSmall() || this.isTooLarge()) {
			return false;
		}

		// Reset current input & operator
		this.currentOperator = null;
		this.currentInput = null;

		// Update both screens
		if (this.previousOperator) {
			this.updateSubscreen([this.previousResult, this.previousOperator, this.previousInput, '=']);
		} else {
			this.updateSubscreen([this.previousInput, '=']);
		}
		this.updateScreen(this.currentResult);

		// Check whether pressing equals again will change the result
		const result0 = this.previousResult === 0;
		const input0 = this.previousInput === 0;
		const input1 = this.previousInput === 1;
		const isAdding = this.previousOperator === ADD || this.previousOperator === SUBTRACT;
		const isMulting = this.previousOperator === MULTIPLY || this.previousOperator === DIVIDE;
		return (isAdding && !input0) || (isMulting && !result0 && !input0 && !input1);
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
	 * Check whether current equation divides by zero, and display an error if so.
	 * @return True if an error was triggered.
	 */
	private isDividingByZero(): boolean {
		if (this.currentOperator === DIVIDE && this.currentInput && Number(this.currentInput) === 0) {
			const subscreen = [this.previousResult, this.previousOperator, this.previousInput, '='];
			this.pressClear();
			this.updateSubscreen(subscreen);
			this.currentError = 'Cannot divide by zero';
			this.updateScreen(this.currentError, true);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Check whether current equation underflows a 64-bit float, and display an error if so.
	 * @return True if an error was triggered.
	 */
	private isTooSmall(): boolean {
		if (this.currentResult !== 0) {
			return false;
		}

		// Determine whether the result underflowed to zero
		const wasNotZero = this.previousResult !== 0 && Number(this.previousInput) !== 0;
		const wasMulting = this.previousOperator === MULTIPLY || this.previousOperator === DIVIDE;

		if (wasNotZero && wasMulting) {
			const subscreen = [this.previousResult, this.previousOperator, this.previousInput, '='];
			this.pressClear();
			this.updateSubscreen(subscreen);
			this.currentError = 'Number too small';
			this.updateScreen(this.currentError, true);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Check whether current equation overflows a 64-bit float, and display an error if so.
	 * @return True if an error was triggered.
	 */
	private isTooLarge(): boolean {
		if (this.currentResult !== null && Math.abs(this.currentResult) > Number.MAX_VALUE) {
			const subscreen = [this.previousResult, this.previousOperator, this.previousInput, '='];
			this.pressClear();
			this.updateSubscreen(subscreen);
			this.currentError = 'Number too large';
			this.updateScreen(this.currentError, true);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Update the subscreen.
	 * @param output An array of numbers and strings. Null values are skipped.
	 */
	private updateSubscreen(outputs: (number | string | null)[] | null): void {
		let output: string;
		if (outputs === null) {
			output = '0'; // Preserve subscreen height while blank
		} else {
			// Replace ASCII symbols with typographic symbols
			output = outputs.join(' ')
				.replace(/\./g, DECIMAL_SYMBOL)
				.replace(/-/g, '−')
				.replace('*', '×')
				.replace('/', '÷')
		}

		// Output to subscreen
		this.subscreenEl.setText(output);
		this.subscreenEl.toggleClass('calculite-invisible', outputs === null);

		// Ask workspace to preserve view state
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Update the main screen.
	 * @param output A number or string. Null clears the screen.
	 */
	private updateScreen(output: number | string | null, isError = false): void {
		if (isError) {
			output = String(output);
		} else if (output === null) {
			output = '0';
		} else {
			// Replace ASCII symbols with typographical symbols
			output = String(output).replace('-', '−').replace('.', DECIMAL_SYMBOL);

			// Separate digits in groups of 3
			if (!output.includes('e')) {
				// Locate first digit
				const indexL = output.startsWith('−') ? 1 : 0;

				// Locate decimal point
				const indexR = output.includes(DECIMAL_SYMBOL)
					? output.indexOf(DECIMAL_SYMBOL)
					: output.length;

				// Insert separators from right-to-left
				for (let i = indexR - 3; i > indexL; i -= 3) {
					output = output.slice(0, i) + GROUPING_SYMBOL + output.slice(i);
				}
			}
		}

		// Output to screen
		this.screenEl.setText(output);
		this.screenEl.toggleClass('calculite-error', isError);

		// Ask workspace to preserve view state
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Condense a screen if necessary to prevent text overflow.
	 * @param screenEl Any screen element.
	 */
	private condenseScreen(screenEl: HTMLDivElement): void {
		if (!this.canvasCtx || screenEl.hasClass('calculite-blank')) {
			return;
		}

		// Remove any scaling before measurement
		screenEl.removeAttribute('style');

		// Measure the overflow ratio
		const { fontWeight, fontSize, fontFamily } = getComputedStyle(screenEl);
		this.canvasCtx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
		const textWidth = this.canvasCtx.measureText(screenEl.getText()).width
		const overflow = textWidth / screenEl.clientWidth;

		// If screen is overflowing, scale it to fit perfectly
		if (overflow > 1) {
			screenEl.style.setProperty('transform', `scaleX(${1 / overflow})`);
		}
	}

	/**
	 * Copy a screen to the clipboard.
	 * @param screenEl Any screen element.
	 * @param event Clipboard event to cancel.
	 */
	private copyScreen(screenEl: HTMLDivElement, event?: ClipboardEvent): void {
		event?.preventDefault();

		// Get selected text (or all text) from screen
		const selection = this.getScreenSelection(screenEl);
		const copiedText = selection?.toString() ?? screenEl.getText();

		// Write to clipboard
		navigator.clipboard.writeText(copiedText);

		// Trigger animation
		screenEl.addClass('calculite-copied');
	}

	/**
	 * Paste clipboard to the main screen.
	 * @param event Clipboard event to cancel.
	 */
	private async pasteScreen(event?: ClipboardEvent): Promise<void> {
		event?.preventDefault();

		// Clear any finished calculations
		if (this.currentOperator === null) {
			this.pressClear();
		}

		// Get text from clipboard
		const pastedText = await navigator.clipboard.readText();

		// Remove all non-numeric characters
		const pastedNumerics = pastedText.replace(NON_NUMERIC_CHARS, '') || 'NaN';
		const pastedNumber = Number(pastedNumerics);

		// Reject invalid numbers like NaN and Infinity
		if (!Number.isFinite(pastedNumber)) {
			this.currentInput = null;
			this.updateScreen('Invalid number', true);
		} else if (this.countDigits(pastedNumerics) > MAX_DIGITS) {
			this.currentInput = null;
			this.updateScreen(`Maximum of ${MAX_DIGITS} digits`, true);
		} else {
			this.currentInput = pastedNumerics;
			this.updateScreen(this.currentInput);
		}

		// Trigger animation
		this.screenEl.addClass('calculite-pasted');
	}

	/**
	 * Select all text on a given screen.
	 * @param screenEl Any screen element.
	 */
	private selectScreen(screenEl: HTMLDivElement): void {
		const doc = window.activeDocument ?? document; // Pre-0.15 compatible
		const selection = doc.getSelection();
		const range = doc.createRange();

		range.selectNode(screenEl);
		selection?.removeAllRanges();
		selection?.addRange(range);
	}

	/**
	 * Get the current text selection from a given screen.
	 * @param screenEl Any screen element.
	 * @returns A selection object, or null if the given screen is not selected.
	 */
	private getScreenSelection(screenEl: HTMLDivElement): Selection | null {
		const doc = window.activeDocument ?? document; // Pre-0.15 compatible
		const selection = doc.getSelection();
		const node = screenEl.firstChild ?? screenEl;

		return selection?.containsNode(node) ? selection : null;
	}

	/**
	 * Count the number of numeric digits in a string.
	 * @param output A string representing a number.
	 * @returns The digit count.
	 */
	private countDigits(output: string): number {
		const matches = output.match(/\d/g) ?? [];
		return matches.length;
	}
}
