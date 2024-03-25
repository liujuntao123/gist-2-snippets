import fs from 'fs/promises';
import inquirer from 'inquirer';
import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import { JSONFilePreset } from 'lowdb/node'
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
const __dirname = path.dirname(fileURLToPath(import.meta.url));



class GistHelper {
  constructor() {
    this.db = null;
    this.octokit = null;
  }

  async initDb() {
    if (this.db) return;
    const db = await JSONFilePreset(path.join(__dirname, '../', 'db.json'), {})
    this.db = db;
  }

  initOctokit() {
    this.octokit = new Octokit({
      auth: this.db.data.token
    });
  }

  async init() {
    await this.initDb();
    console.log(chalk.blue('初始化...'));
    if (!await this.checkLogin()) {
      await this.login();
    }
    if (!await this.checkFolder()) {
      await this.setFolder();
    }
    this.initOctokit();

    console.log(chalk.blue('初始化成功！'));
  }

  async clearToken() {
    await this.initDb();
    this.db.data.token = null;
    this.db.data.userInfo = null;
    this.db.write();
    console.log(chalk.blue('已清除token'));
  }

  async clearFolder() {
    await this.initDb();
    this.db.data.folder = null;
    this.db.write();
    console.log(chalk.blue('已清除folder'));
  }

  async clear() {
    await this.initDb();
    this.db.data.token = null;
    this.db.data.userInfo = null;
    this.db.data.folder = null;
    this.db.write();
    console.log(chalk.blue('已清除所有设置'));
  }

  async checkFolder() {
    await this.initDb();
    let folder = this.db.data.folder;
    if (!folder) {
      console.log(chalk.red('请设置vscode snippets文件夹'));
      return false;
    }
    console.log(chalk.blue('当前vscode snippets文件夹：'), chalk.yellow(folder));
    return true;
  }


  async checkLogin() {
    await this.initDb();
    if (this.db.data.token && this.db.data.userInfo) {
      console.log(chalk.blue('当前登录用户：'), chalk.yellow(this.db.data.userInfo.login));
      return true;
    }
    console.log(chalk.red('请登录'));
    return false;

  }

  async login() {
    await this.initDb();
    let answers = await inquirer.prompt([{
      type: 'input',
      name: 'token',
      message: '输入你的github token'
    }]);

    try {
      this.db.data.token = answers.token;
      this.initOctokit();
      let { data } = await this.octokit.users.getAuthenticated();
      this.db.data.userInfo = data;
      this.db.write();
      console.log(chalk.blue('登录成功！当前登录用户：'), chalk.yellow(data.login));
    } catch (err) {
      console.log('登录失败，token错误');
    }
  }


  async pull() {
    await this.init()
    console.log(chalk.blue('开始同步...'));
    try {
      let { data } = await this.octokit.gists.list();
      let gists = data;
      let snippets = {};
      for (let gist of gists) {
        let converted = await this.convert(gist);
        snippets = Object.assign(snippets, converted);
      }

      this.save(snippets);
      console.log(chalk.blue('同步成功！'));

    } catch (err) {
      console.log(err);
    }
  }

  async save(content) {
    const name = 'gist-snippets.code-snippets';
    const Folder = {
      '当前目录': path.join(process.cwd(), '.vscode'),
      '全局': process.env.APPDATA + '\\Code\\User\\snippets'
    }
    let dir = Folder[this.db.data.folder];
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir);
    }
    return await fs.writeFile(path.join(dir, name), JSON.stringify(content, null, 2));
  }



  async convert(gist) {
    let files = gist.files;
    let snippets = {};
    await Promise.all(Object.keys(files).map(async filename => {
      const content = await axios.get(files[filename].raw_url);
      snippets[filename] = {
        "prefix": filename,
        "body": content.data.split('\n'),
        "description": gist.description,
        "gistId": gist.id,
      };
    }));
    return snippets;
  }


  async setFolder() {
    let answers = await inquirer.prompt([{
      type: 'list',
      name: 'folder',
      message: '选择你的vscode snippets文件夹',
      choices: ['当前目录', '全局']
    }]);

    this.db.data.folder = answers.folder;
    this.db.write();
  }
}

export default GistHelper;