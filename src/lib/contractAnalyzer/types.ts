import { FindingSeverity, FindingConfidence, ContractFinding } from '../../types/security';

export interface ParsedContract {
  name: string;
  kind: 'contract' | 'interface' | 'library' | 'abstract';
  baseContracts: string[];
  functions: ParsedFunction[];
  modifiers: ParsedModifier[];
  stateVariables: ParsedVariable[];
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  fileName: string;
}

export interface ParsedFunction {
  name: string;
  visibility: 'public' | 'external' | 'internal' | 'private' | 'default';
  stateMutability?: 'pure' | 'view' | 'payable' | 'nonpayable';
  modifiers: string[];
  parameters: Array<{ name: string; type: string }>;
  bodyRawText: string;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  isConstructor: boolean;
  contractName: string;
  fileName: string;
}

export interface ParsedModifier {
  name: string;
  parameters: Array<{ name: string; type: string }>;
  bodyRawText: string;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  contractName: string;
  fileName: string;
}

export interface ParsedVariable {
  name: string;
  type: string;
  visibility: string;
  isConstant: boolean;
  isImmutable: boolean;
}

export interface AnalysisContext {
  files: Array<{ fileName: string; content: string }>;
  contracts: ParsedContract[];
  contractMap: Map<string, ParsedContract>;
  inheritanceMap: Map<string, Set<string>>;
}
