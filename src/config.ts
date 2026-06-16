import { ConfigProvider } from 'tabby-core'

export interface CommandCompletionHistoryItem {
    command: string
    system: string
    count: number
    lastUsed: number
}

export interface CommandCompletionConfig {
    enabled: boolean
    maxHistoryItems: number
    maxSuggestions: number
    minPrefixLength: number
    shareAcrossSystems: boolean
    history: CommandCompletionHistoryItem[]
}

export class CommandCompletionConfigProvider extends ConfigProvider {
    defaults = {
        commandCompletion: {
            enabled: true,
            maxHistoryItems: 10000,
            maxSuggestions: 8,
            minPrefixLength: 1,
            shareAcrossSystems: false,
            history: [],
        },
    }
}
