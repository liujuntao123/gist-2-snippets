#!/usr/bin/env node

import program from 'commander';
import GistHelper from './gistHelper.mjs';
const gistHelper = new GistHelper();

program.command('init').description('init your snippets').action(function() {
    gistHelper.init()
})

program.command('pull').description('pull your snippets').action(function() {
    gistHelper.pull()
})

program.command('clear').description('clear your snippets').action(function() {
    gistHelper.clear()
})

program.command('clearToken').description('clear your token').action(function() {
    gistHelper.clearToken()
})

program.command('clearFolder').description('clear your folder').action(function() {
    gistHelper.clearFolder()
})


program.parse();
