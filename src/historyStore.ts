import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { CommandCompletionConfig, CommandCompletionHistoryItem } from './config'

export interface CompletionCandidate {
    command: string
    score: number
    detail: string
}

@Injectable()
export class CommandHistoryStore {
    private saveTimer: ReturnType<typeof setTimeout>|null = null

    constructor (
        private config: ConfigService,
    ) { }

    add (commandLine: string, system: string): void {
        const command = commandLine.trim()
        if (!this.canStore(commandLine, command)) {
            return
        }

        const state = this.state
        const now = Date.now()
        const existing = state.history.find(x => x.command === command && x.system === system)
        if (existing) {
            existing.count++
            existing.lastUsed = now
        } else {
            state.history.push({
                command,
                system,
                count: 1,
                lastUsed: now,
            })
        }

        state.history.sort((a, b) => b.lastUsed - a.lastUsed)
        state.history.splice(state.maxHistoryItems)
        this.scheduleSave()
    }

    suggest (query: string, system: string): CompletionCandidate[] {
        const state = this.state
        const normalizedQuery = query.trimStart().toLowerCase()
        if (normalizedQuery.length < state.minPrefixLength && query !== '') {
            return []
        }

        return state.history
            .filter(item => state.shareAcrossSystems || item.system === system)
            .map(item => this.score(item, normalizedQuery))
            .filter((candidate): candidate is CompletionCandidate => candidate !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, state.maxSuggestions)
    }

    get enabled (): boolean {
        return this.state.enabled
    }

    private get state (): CommandCompletionConfig {
        const root = this.config.store.commandCompletion ??= {}
        root.enabled ??= true
        root.maxHistoryItems ??= 10000
        root.maxSuggestions ??= 8
        root.minPrefixLength ??= 1
        root.shareAcrossSystems ??= false
        root.history ??= []
        return root
    }

    private canStore (rawCommand: string, command: string): boolean {
        if (!command) {
            return false
        }
        if (rawCommand.startsWith(' ')) {
            return false
        }
        if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(command)) {
            return false
        }
        return true
    }

    private score (item: CommandCompletionHistoryItem, normalizedQuery: string): CompletionCandidate|null {
        const command = item.command.toLowerCase()
        let matchScore = 0

        if (!normalizedQuery) {
            matchScore = 1
        } else if (command.startsWith(normalizedQuery)) {
            matchScore = 100
        } else {
            const wordIndex = command.search(new RegExp(`(^|\\s)${escapeRegExp(normalizedQuery)}`))
            if (wordIndex >= 0) {
                matchScore = 60
            } else if (command.includes(normalizedQuery)) {
                matchScore = 20
            } else {
                return null
            }
        }

        const ageHours = Math.max(0, Date.now() - item.lastUsed) / 3600000
        const recencyScore = 20 / (1 + ageHours)
        const frequencyScore = Math.min(Math.log2(item.count + 1), 10)
        return {
            command: item.command,
            score: matchScore + recencyScore + frequencyScore,
            detail: item.count > 1 ? `${item.count} uses` : 'recent',
        }
    }

    private scheduleSave (): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer)
        }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null
            this.config.save()
        }, 1000)
    }
}

function escapeRegExp (text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
