import Commander from 'x-command-parser';
import MakeModel from './makeDbModel';


async function Main(args: string[]) {
    const command = new Commander(true)
        .addAsyncSubCommand('model', '生产Mode', MakeModel, true)
        .parseAsync(args);
    
    return 0;
}

Main(process.argv.slice(2));
