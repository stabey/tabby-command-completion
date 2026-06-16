import { SessionMiddleware } from 'tabby-terminal'
import { CommandHistoryStore } from './historyStore'

export class CommandLineTrackerMiddleware extends SessionMiddleware {
    private line = ''
    private cursor = 0

    constructor (
        private history: CommandHistoryStore,
        private system: string,
        private lineChanged: () => void,
    ) {
        super()
    }

    feedFromTerminal (data: Buffer): void {
        this.consume(data.toString('utf-8'))
        this.outputToSession.next(data)
    }

    getLine (): string {
        return this.line
    }

    isCursorAtEnd (): boolean {
        return this.cursor === this.line.length
    }

    private consume (text: string): void {
        let changed = false
        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            if (char === '\x1b') {
                const sequenceEnd = this.findEscapeSequenceEnd(text, i)
                const sequence = text.slice(i, sequenceEnd)
                changed = this.consumeEscape(sequence) || changed
                i = sequenceEnd - 1
                continue
            }

            changed = this.consumeChar(char) || changed
        }

        if (changed) {
            this.lineChanged()
        }
    }

    private consumeChar (char: string): boolean {
        switch (char) {
            case '\r':
            case '\n':
                this.commitLine()
                return true
            case '\x03':
            case '\x04':
                this.clearLine()
                return true
            case '\x01':
                this.cursor = 0
                return true
            case '\x05':
                this.cursor = this.line.length
                return true
            case '\x15':
                this.line = this.line.slice(this.cursor)
                this.cursor = 0
                return true
            case '\x17':
                this.deletePreviousWord()
                return true
            case '\x7f':
            case '\b':
                if (this.cursor > 0) {
                    this.line = this.line.slice(0, this.cursor - 1) + this.line.slice(this.cursor)
                    this.cursor--
                    return true
                }
                return false
            default:
                if (this.isPrintable(char)) {
                    this.line = this.line.slice(0, this.cursor) + char + this.line.slice(this.cursor)
                    this.cursor += char.length
                    return true
                }
                return false
        }
    }

    private consumeEscape (sequence: string): boolean {
        switch (sequence) {
            case '\x1b[D':
            case '\x1bOD':
                this.cursor = Math.max(0, this.cursor - 1)
                return true
            case '\x1b[C':
            case '\x1bOC':
                this.cursor = Math.min(this.line.length, this.cursor + 1)
                return true
            case '\x1b[H':
            case '\x1bOH':
                this.cursor = 0
                return true
            case '\x1b[F':
            case '\x1bOF':
                this.cursor = this.line.length
                return true
            case '\x1b[3~':
                if (this.cursor < this.line.length) {
                    this.line = this.line.slice(0, this.cursor) + this.line.slice(this.cursor + 1)
                    return true
                }
                return false
            case '\x1bb':
            case '\x1b[1;5D':
                this.movePreviousWord()
                return true
            case '\x1bf':
            case '\x1b[1;5C':
                this.moveNextWord()
                return true
            default:
                return false
        }
    }

    private commitLine (): void {
        this.history.add(this.line, this.system)
        this.clearLine()
    }

    private clearLine (): void {
        this.line = ''
        this.cursor = 0
    }

    private deletePreviousWord (): void {
        if (this.cursor === 0) {
            return
        }
        const left = this.line.slice(0, this.cursor)
        const right = this.line.slice(this.cursor)
        const trimmedLeft = left.replace(/\s+$/, '')
        const wordStart = trimmedLeft.search(/\S+$/)
        const keepLeft = wordStart >= 0 ? trimmedLeft.slice(0, wordStart) : ''
        this.line = keepLeft + right
        this.cursor = keepLeft.length
    }

    private movePreviousWord (): void {
        const left = this.line.slice(0, this.cursor).replace(/\s+$/, '')
        const wordStart = left.search(/\S+$/)
        this.cursor = wordStart >= 0 ? wordStart : 0
    }

    private moveNextWord (): void {
        const right = this.line.slice(this.cursor)
        const match = /\s+\S/.exec(right)
        this.cursor = match ? this.cursor + match.index + match[0].length : this.line.length
    }

    private findEscapeSequenceEnd (text: string, start: number): number {
        if (text[start + 1] === '[') {
            for (let i = start + 2; i < text.length; i++) {
                if (/[~A-Za-z]/.test(text[i])) {
                    return i + 1
                }
            }
        }
        if (text[start + 1] === 'O') {
            return Math.min(text.length, start + 3)
        }
        return Math.min(text.length, start + 2)
    }

    private isPrintable (char: string): boolean {
        return char >= ' ' && char !== '\x7f'
    }
}
