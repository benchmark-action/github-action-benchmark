import { ToolType } from '../config';

export function biggerIsBetter(tool: ToolType): boolean {
    switch (tool) {
        case 'cargo':
            return false;
        case 'go':
            return false;
        case 'benchmarkjs':
            return true;
        case 'benchmarkluau':
            return false;
        case 'pytest':
            return true;
        case 'googlecpp':
            return false;
        case 'catch2':
            return false;
        case 'julia':
            return false;
        case 'jmh':
            return false;
        case 'benchmarkdotnet':
            return false;
        case 'customBiggerIsBetter':
            return true;
        case 'customSmallerIsBetter':
            return false;
    }
}
