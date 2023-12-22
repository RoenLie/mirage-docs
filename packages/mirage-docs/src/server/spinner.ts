import { stdin, stdout } from 'node:process';
import { createInterface, cursorTo, Interface } from 'node:readline';


const spinners = {
	basic: {
		interval: 80,
		frames:   [ '-', '\\', '|', '/' ],
	},
};


export class Spinner {

	protected static rl?: Interface;
	protected static timer: ReturnType<typeof setInterval>;
	public static start(spinnerName: keyof typeof spinners) {
		this.rl = createInterface({
			input:  stdin,
			output: stdout,
		});

		this.rl.write('\x1B[?25l');

		console.log('cursor pos', this.rl.getCursorPos());

		const spin = spinners[spinnerName];
		const spinnerFrames = spin.frames;
		const spinnerTimeInterval = spin.interval;

		let index = 0;
		this.timer = setInterval(() => {
			const now = spinnerFrames[index];
			if (now === undefined)
				return this.stop();

			const cursorPos = this.rl!.getCursorPos();
			this.rl!.write(now);
			cursorTo(stdout, 0, 2);

			index = index >= (spinnerFrames.length - 1) ? 0 : index + 1;
		}, spinnerTimeInterval);

		//this.rl.close();
	}

	public static stop() {
		clearInterval(this.timer);
		this.rl?.close();
	}

}

Spinner.start('basic');
setTimeout(() => {
	Spinner.stop();
}, 1000);
