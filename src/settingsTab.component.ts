import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { CommandCompletionConfig } from './config'

@Component({
    template: require('./settingsTab.component.pug'),
})
export class CommandCompletionSettingsTabComponent {
    acceptKeys = [
        { value: 'tab', name: 'Tab' },
        { value: 'enter', name: 'Enter' },
    ]

    triggerModes = [
        { value: 'prefix', name: 'Automatic prefix suggestions' },
        { value: 'manual', name: 'Manual shortcuts only' },
    ]

    constructor (
        public config: ConfigService,
    ) { }

    get options (): CommandCompletionConfig {
        const root = this.config.store.commandCompletion ??= {}
        root.enabled ??= true
        root.autoShow ??= true
        root.triggerMode ??= 'prefix'
        root.acceptKey ??= 'tab'
        root.maxHistoryItems ??= 10000
        root.maxSuggestions ??= 8
        root.minPrefixLength ??= 1
        root.shareAcrossSystems ??= false
        root.history ??= []
        return root
    }

    save (): void {
        this.options.minPrefixLength = this.clamp(this.options.minPrefixLength, 1, 20)
        this.options.maxSuggestions = this.clamp(this.options.maxSuggestions, 1, 50)
        this.options.maxHistoryItems = this.clamp(this.options.maxHistoryItems, 100, 100000)
        this.config.save()
    }

    clearHistory (): void {
        this.options.history = []
        this.config.save()
    }

    private clamp (value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, Number(value) || min))
    }
}
