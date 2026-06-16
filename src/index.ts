import { NgModule } from '@angular/core'
import { ConfigProvider } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'
import { CommandCompletionConfigProvider } from './config'
import { CommandCompletionDecorator } from './decorator'
import { CommandHistoryStore } from './historyStore'

@NgModule({
    providers: [
        CommandHistoryStore,
        { provide: ConfigProvider, useClass: CommandCompletionConfigProvider, multi: true },
        { provide: TerminalDecorator, useClass: CommandCompletionDecorator, multi: true },
    ],
})
export default class CommandCompletionModule { }

export * from './config'
export * from './historyStore'
