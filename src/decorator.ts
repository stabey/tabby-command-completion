import { Injectable } from '@angular/core'
import { BaseTerminalTabComponent, TerminalDecorator, XTermFrontend } from 'tabby-terminal'
import { CompletionPopup } from './completionPopup'
import { CommandLineTrackerMiddleware } from './lineTracker'
import { CompletionCandidate, CommandHistoryStore } from './historyStore'

interface AttachedTracker {
    session: {
        middleware: {
            remove: (middleware: CommandLineTrackerMiddleware) => void
        }
    }
    tracker: CommandLineTrackerMiddleware
    system: string
}

@Injectable()
export class CommandCompletionDecorator extends TerminalDecorator {
    private trackers = new Map<BaseTerminalTabComponent<any>, AttachedTracker>()
    private popups = new Map<BaseTerminalTabComponent<any>, CompletionPopup>()
    private keyHandlers = new Map<BaseTerminalTabComponent<any>, (event: KeyboardEvent) => void>()

    constructor (
        private history: CommandHistoryStore,
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent<any>): void {
        if (!(tab.frontend instanceof XTermFrontend)) {
            return
        }

        setTimeout(() => {
            this.attachToSession(tab)
            this.attachKeyHandler(tab)
            this.subscribeUntilDetached(tab, tab.sessionChanged$.subscribe(() => this.attachToSession(tab)))
        })
    }

    detach (tab: BaseTerminalTabComponent<any>): void {
        this.removeTracker(tab)
        this.removeKeyHandler(tab)
        this.popups.get(tab)?.dispose()
        this.popups.delete(tab)
        super.detach(tab)
    }

    private attachToSession (tab: BaseTerminalTabComponent<any>): void {
        this.removeTracker(tab)

        if (!tab.session || !this.history.enabled) {
            return
        }

        const system = this.getSystemKey(tab)
        const tracker = new CommandLineTrackerMiddleware(
            this.history,
            system,
            () => this.onLineChanged(tab),
        )
        tab.session.middleware.unshift(tracker)
        this.trackers.set(tab, {
            session: tab.session,
            tracker,
            system,
        })
    }

    private attachKeyHandler (tab: BaseTerminalTabComponent<any>): void {
        if (!(tab.frontend instanceof XTermFrontend) || !tab.frontend.xterm.element) {
            return
        }
        if (this.keyHandlers.has(tab)) {
            return
        }

        const handler = (event: KeyboardEvent) => this.onKeyDown(tab, event)
        tab.frontend.xterm.element.addEventListener('keydown', handler, true)
        this.keyHandlers.set(tab, handler)
    }

    private removeKeyHandler (tab: BaseTerminalTabComponent<any>): void {
        const handler = this.keyHandlers.get(tab)
        if (!(tab.frontend instanceof XTermFrontend) || !handler) {
            return
        }
        tab.frontend.xterm.element?.removeEventListener('keydown', handler, true)
        this.keyHandlers.delete(tab)
    }

    private removeTracker (tab: BaseTerminalTabComponent<any>): void {
        const attached = this.trackers.get(tab)
        if (!attached) {
            return
        }
        attached.session.middleware.remove(attached.tracker)
        this.trackers.delete(tab)
    }

    private onKeyDown (tab: BaseTerminalTabComponent<any>, event: KeyboardEvent): void {
        if (!this.history.enabled) {
            return
        }

        const popup = this.popups.get(tab)
        if (popup?.isVisible()) {
            if (this.handlePopupKey(popup, event)) {
                event.preventDefault()
                event.stopImmediatePropagation()
            }
            return
        }

        if (event.key === 'Tab') {
            const candidates = this.getCandidates(tab)
            if (candidates.length) {
                event.preventDefault()
                event.stopImmediatePropagation()
                this.showPopup(tab, candidates)
            }
            return
        }

        if (event.key.toLowerCase() === 'r' && event.ctrlKey && !event.altKey && !event.metaKey) {
            const candidates = this.getCandidates(tab, true)
            if (candidates.length) {
                event.preventDefault()
                event.stopImmediatePropagation()
                this.showPopup(tab, candidates)
            }
        }
    }

    private handlePopupKey (popup: CompletionPopup, event: KeyboardEvent): boolean {
        switch (event.key) {
            case 'ArrowDown':
                popup.selectNext()
                return true
            case 'ArrowUp':
                popup.selectPrevious()
                return true
            case 'Tab':
                if (this.history.settings.acceptKey === 'tab') {
                    popup.acceptSelected()
                } else {
                    popup.selectNext()
                }
                return true
            case 'Enter':
                if (this.history.settings.acceptKey === 'enter') {
                    popup.acceptSelected()
                    return true
                }
                popup.hide()
                return false
            case 'Escape':
                popup.hide()
                return true
            default:
                return false
        }
    }

    private showPopup (tab: BaseTerminalTabComponent<any>, candidates: CompletionCandidate[]): void {
        const popup = this.getPopup(tab)
        popup.show(candidates)
    }

    private onLineChanged (tab: BaseTerminalTabComponent<any>): void {
        const popup = this.popups.get(tab)
        const candidates = this.getCandidates(tab)
        if (popup?.isVisible()) {
            popup.update(candidates)
            return
        }
        if (!this.history.settings.autoShow || this.history.settings.triggerMode !== 'prefix') {
            return
        }
        if (candidates.length) {
            this.showPopup(tab, candidates)
        }
    }

    private getPopup (tab: BaseTerminalTabComponent<any>): CompletionPopup {
        let popup = this.popups.get(tab)
        if (!popup) {
            popup = new CompletionPopup(tab.frontend as XTermFrontend, candidate => this.accept(tab, candidate))
            this.popups.set(tab, popup)
        }
        return popup
    }

    private getCandidates (tab: BaseTerminalTabComponent<any>, forceHistory = false): CompletionCandidate[] {
        const attached = this.trackers.get(tab)
        if (!attached || !attached.tracker.isCursorAtEnd()) {
            return []
        }

        const line = attached.tracker.getLine()
        if (forceHistory) {
            return this.history.suggest('', attached.system)
        }
        if (line.startsWith('!')) {
            return this.history.suggest(line.slice(1), attached.system)
        }
        if (!line) {
            return []
        }
        return this.history.suggest(line, attached.system)
    }

    private accept (tab: BaseTerminalTabComponent<any>, candidate: CompletionCandidate): void {
        const attached = this.trackers.get(tab)
        if (!attached) {
            return
        }

        const line = attached.tracker.getLine()
        const replacementPrefix = line.startsWith('!') ? line : null
        let input = ''

        if (replacementPrefix) {
            input = '\x7f'.repeat(replacementPrefix.length) + candidate.command
        } else if (candidate.command.toLowerCase().startsWith(line.toLowerCase())) {
            input = candidate.command.slice(line.length)
        } else {
            input = '\x7f'.repeat(line.length) + candidate.command
        }

        this.popups.get(tab)?.hide()
        if (input) {
            tab.sendInput(input)
        }
    }

    private getSystemKey (tab: BaseTerminalTabComponent<any>): string {
        const profile = tab.profile
        switch (tab.profile.type) {
            case 'local':
                return `local:${profile.id}:${profile.options.shellType ?? profile.name}`
            case 'ssh':
                return `ssh:${profile.options.user ?? ''}@${profile.options.host ?? profile.name}:${profile.options.port ?? 22}`
            case 'telnet':
                return `telnet:${profile.options.host ?? profile.name}:${profile.options.port ?? 23}`
            case 'serial':
                return `serial:${profile.options.port ?? profile.id}`
            default:
                return `${profile.type}:${profile.id}`
        }
    }
}
