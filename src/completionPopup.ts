import { XTermFrontend } from 'tabby-terminal'
import { CompletionCandidate } from './historyStore'

export class CompletionPopup {
    private element: HTMLElement
    private candidates: CompletionCandidate[] = []
    private selectedIndex = 0
    private visible = false

    constructor (
        private frontend: XTermFrontend,
        private accept: (candidate: CompletionCandidate) => void,
    ) {
        this.element = document.createElement('div')
        this.element.className = 'tabby-command-completion'
        this.applyBaseStyle()
        this.element.addEventListener('mousedown', event => this.onMouseDown(event))
    }

    show (candidates: CompletionCandidate[]): void {
        this.candidates = candidates
        this.selectedIndex = 0
        this.visible = true
        if (!this.element.parentElement) {
            document.body.appendChild(this.element)
        }
        this.render()
        this.reposition()
    }

    update (candidates: CompletionCandidate[]): void {
        if (!this.visible) {
            return
        }
        if (!candidates.length) {
            this.hide()
            return
        }
        this.candidates = candidates
        this.selectedIndex = Math.min(this.selectedIndex, candidates.length - 1)
        this.render()
        this.reposition()
    }

    hide (): void {
        this.visible = false
        this.element.remove()
    }

    dispose (): void {
        this.hide()
    }

    isVisible (): boolean {
        return this.visible
    }

    selectNext (): void {
        if (!this.candidates.length) {
            return
        }
        this.selectedIndex = (this.selectedIndex + 1) % this.candidates.length
        this.render()
    }

    selectPrevious (): void {
        if (!this.candidates.length) {
            return
        }
        this.selectedIndex = (this.selectedIndex + this.candidates.length - 1) % this.candidates.length
        this.render()
    }

    acceptSelected (): void {
        const candidate = this.candidates[this.selectedIndex]
        if (candidate) {
            this.accept(candidate)
        }
    }

    private render (): void {
        this.element.textContent = ''
        this.candidates.forEach((candidate, index) => {
            const row = document.createElement('div')
            row.dataset.index = String(index)
            Object.assign(row.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '5px 8px',
                cursor: 'default',
                whiteSpace: 'nowrap',
                color: index === this.selectedIndex ? '#ffffff' : '#d7d7d7',
                background: index === this.selectedIndex ? '#2f6fed' : 'transparent',
            })

            const command = document.createElement('span')
            command.textContent = candidate.command
            Object.assign(command.style, {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '560px',
            })

            const detail = document.createElement('span')
            detail.textContent = candidate.detail
            Object.assign(detail.style, {
                color: index === this.selectedIndex ? '#dce8ff' : '#8f8f8f',
                fontSize: '11px',
            })

            row.appendChild(command)
            row.appendChild(detail)
            this.element.appendChild(row)
        })
    }

    private reposition (): void {
        const terminalElement = this.frontend.xterm.element
        const screen = terminalElement?.querySelector('.xterm-screen') as HTMLElement|null
        const rows = terminalElement?.querySelector('.xterm-rows') as HTMLElement|null
        const firstRow = rows?.firstElementChild as HTMLElement|null
        const anchor = screen ?? terminalElement
        if (!anchor) {
            return
        }

        const rect = anchor.getBoundingClientRect()
        const rowRect = firstRow?.getBoundingClientRect()
        const cellWidth = rowRect ? rowRect.width / Math.max(1, this.frontend.xterm.cols) : 8
        const cellHeight = rowRect?.height ?? 18
        const buffer = this.frontend.xterm.buffer.active
        const left = rect.left + Math.min(buffer.cursorX, this.frontend.xterm.cols - 1) * cellWidth
        let top = rect.top + (buffer.cursorY + 1) * cellHeight + 4

        const popupHeight = this.element.offsetHeight || 36
        if (top + popupHeight > window.innerHeight - 8) {
            top = rect.top + buffer.cursorY * cellHeight - popupHeight - 4
        }

        this.element.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 240))}px`
        this.element.style.top = `${Math.max(8, top)}px`
    }

    private onMouseDown (event: MouseEvent): void {
        event.preventDefault()
        const target = event.target as HTMLElement|null
        const row = target?.closest('[data-index]') as HTMLElement|null
        if (!row?.dataset.index) {
            return
        }
        const index = parseInt(row.dataset.index, 10)
        const candidate = this.candidates[index]
        if (candidate) {
            this.accept(candidate)
        }
    }

    private applyBaseStyle (): void {
        Object.assign(this.element.style, {
            position: 'fixed',
            zIndex: '3000',
            minWidth: '260px',
            maxWidth: '680px',
            maxHeight: '280px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '6px',
            background: 'rgba(28, 30, 34, 0.98)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
            fontFamily: 'var(--terminal-font, monospace)',
            fontSize: '12px',
            lineHeight: '1.25',
        })
    }
}
