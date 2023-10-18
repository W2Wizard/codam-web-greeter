import { LightDMPromptType, lightdm } from 'nody-greeter-types/index';

export interface UILoginElements {
	loginForm: HTMLFormElement;
	loginInput: HTMLInputElement;
	passwordInput: HTMLInputElement;
	loginButton: HTMLButtonElement;
}

export class Authenticator {
	private _loginElements: UILoginElements;

	private _authenticating: boolean = false;
	private _authenticated: boolean = false;
	private _username: string = "";
	private _password: string = "";
	private _session: string = "ubuntu"; // always start with ubuntu.desktop X11 session

	public constructor() {
		this._loginElements = {
			loginForm: document.getElementById('login-form') as HTMLFormElement,
			loginInput: document.getElementById('login-input') as HTMLInputElement,
			passwordInput: document.getElementById('password-input') as HTMLInputElement,
			loginButton: document.getElementById('login-button') as HTMLButtonElement,
		};

		// This event gets called when the user clicks the login button or submits the form in any other way
		this._loginElements.loginForm.addEventListener('submit', (event: Event) => {
			event.preventDefault();
			this._username = this._loginElements.loginInput.value;
			this._password = this._loginElements.passwordInput.value;
			this._login();
		});

		// This event gets called when LightDM asks for more authentication data
		window.lightdm?.show_prompt.connect((message: string, type: LightDMPromptType) => {
			switch (type) {
				case LightDMPromptType.Question: // Login (this should never happen as the username was provided by lightdm.authenticate before)
					window.lightdm?.respond(this._username);
					break;
				case LightDMPromptType.Secret: // Password
					window.lightdm?.respond(this._password);
					break;
				default:
					throw new Error(`Unknown lightDM prompt type: ${type}`);
			}
		});

		// This event gets called when LightDM says the authentication was successful and a session should be started
		window.lightdm?.authentication_complete.connect(() => {
			window.lightdm?.start_session(this._session);
		});
	}

	private _clearAuth(): void {
		this._username = "";
		this._password = "";
	}

	private _disableForm(): void {
		this._loginElements.loginInput.disabled = true;
		this._loginElements.passwordInput.disabled = true;
		this._loginElements.loginButton.disabled = true;

		// Blur the focused element
		if (document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
	}

	private _enableForm(): void {
		this._loginElements.loginInput.disabled = false;
		this._loginElements.passwordInput.disabled = false;
		this._loginElements.loginButton.disabled = false;
		this._loginElements.loginInput.focus();
	}

	private _stopAuthentication(): void {
		window.lightdm?.cancel_authentication();
		this._authenticating = false;
		this._authenticated = false;
		this._clearAuth();
		this._enableForm();
	}

	private _startAuthentication(): void {
		window.lightdm?.cancel_authentication();
		if (this._username === "") {
			return this._stopAuthentication();
		}
		this._authenticating = true;
		window.lightdm?.authenticate(this._username); // provide username to skip the username prompt
	}

	private _login(): void {
		if (this._authenticating || this._authenticated) {
			return;
		}

		this._disableForm();
		this._startAuthentication();
	}
}