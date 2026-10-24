import * as parser from '@solidity-parser/parser';
import { AnalysisContext, ParsedContract, ParsedFunction, ParsedModifier } from './types';
import { ContractSourceFile } from '../../types/security';

export function parseSoliditySources(files: ContractSourceFile[]): AnalysisContext {
  const contracts: ParsedContract[] = [];
  const contractMap = new Map<string, ParsedContract>();
  const inheritanceMap = new Map<string, Set<string>>();

  for (const file of files) {
    if (!file.content || !file.content.trim()) continue;

    try {
      const ast = parser.parse(file.content, { loc: true, range: true, tolerant: true });
      parser.visit(ast, {
        ContractDefinition(node: any) {
          const baseContracts: string[] = [];
          if (node.baseContracts && Array.isArray(node.baseContracts)) {
            for (const base of node.baseContracts) {
              if (base.baseName?.namePath) {
                baseContracts.push(base.baseName.namePath);
              }
            }
          }

          const parsedFunctions: ParsedFunction[] = [];
          const parsedModifiers: ParsedModifier[] = [];

          if (node.subNodes && Array.isArray(node.subNodes)) {
            for (const sub of node.subNodes) {
              if (sub.type === 'FunctionDefinition') {
                const funcMods: string[] = [];
                if (sub.modifiers && Array.isArray(sub.modifiers)) {
                  for (const m of sub.modifiers) {
                    if (m.name) funcMods.push(m.name);
                  }
                }

                const params: Array<{ name: string; type: string }> = [];
                if (sub.parameters && Array.isArray(sub.parameters)) {
                  for (const p of sub.parameters) {
                    const pName = p.name || '';
                    let pType = 'unknown';
                    if (p.typeName) {
                      pType = p.typeName.name || p.typeName.namePath || p.typeName.type || 'unknown';
                    }
                    params.push({ name: pName, type: pType });
                  }
                }

                // Extract body text if range is available
                let bodyText = '';
                if (sub.body && sub.body.loc) {
                  const startLine = sub.body.loc.start.line;
                  const endLine = sub.body.loc.end.line;
                  const lines = file.content.split('\n');
                  bodyText = lines.slice(startLine - 1, endLine).join('\n');
                }

                parsedFunctions.push({
                  name: sub.name || (sub.isConstructor ? 'constructor' : sub.isFallback ? 'fallback' : 'receive'),
                  visibility: sub.visibility || 'default',
                  stateMutability: sub.stateMutability,
                  modifiers: funcMods,
                  parameters: params,
                  bodyRawText: bodyText,
                  loc: sub.loc || {
                    start: { line: 1, column: 0 },
                    end: { line: 1, column: 0 },
                  },
                  isConstructor: Boolean(sub.isConstructor),
                  contractName: node.name,
                  fileName: file.fileName,
                });
              } else if (sub.type === 'ModifierDefinition') {
                let modBodyText = '';
                if (sub.body && sub.body.loc) {
                  const startLine = sub.body.loc.start.line;
                  const endLine = sub.body.loc.end.line;
                  const lines = file.content.split('\n');
                  modBodyText = lines.slice(startLine - 1, endLine).join('\n');
                }

                parsedModifiers.push({
                  name: sub.name,
                  parameters: [],
                  bodyRawText: modBodyText,
                  loc: sub.loc || {
                    start: { line: 1, column: 0 },
                    end: { line: 1, column: 0 },
                  },
                  contractName: node.name,
                  fileName: file.fileName,
                });
              }
            }
          }

          const parsedContract: ParsedContract = {
            name: node.name,
            kind: node.kind || 'contract',
            baseContracts,
            functions: parsedFunctions,
            modifiers: parsedModifiers,
            stateVariables: [],
            loc: node.loc || {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 0 },
            },
            fileName: file.fileName,
          };

          contracts.push(parsedContract);
          contractMap.set(node.name, parsedContract);
        },
      });
    } catch (parseError) {
      console.warn(`[AST Parser] Warning: AST parsing error on ${file.fileName}, using regex fallback:`, parseError);
      // Fallback regex extractor for fault tolerance
      const fallbackContracts = fallbackRegexParse(file.fileName, file.content);
      for (const c of fallbackContracts) {
        contracts.push(c);
        contractMap.set(c.name, c);
      }
    }
  }

  // Build inheritance map (transitive closure)
  for (const c of contracts) {
    const inherited = new Set<string>();
    const toVisit = [...c.baseContracts];
    while (toVisit.length > 0) {
      const baseName = toVisit.pop()!;
      if (!inherited.has(baseName)) {
        inherited.add(baseName);
        const baseContract = contractMap.get(baseName);
        if (baseContract) {
          toVisit.push(...baseContract.baseContracts);
        }
      }
    }
    inheritanceMap.set(c.name, inherited);
  }

  return {
    files,
    contracts,
    contractMap,
    inheritanceMap,
  };
}

/**
 * Robust fallback regex parser if AST parser encounters non-standard assembly or compiler pragmas.
 */
function fallbackRegexParse(fileName: string, content: string): ParsedContract[] {
  const contracts: ParsedContract[] = [];
  const lines = content.split('\n');

  // Match: contract Foo is Bar, Baz {
  const contractRegex = /(?:abstract\s+)?contract\s+([a-zA-Z0-9_]+)(?:\s+is\s+([^{]+))?\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = contractRegex.exec(content)) !== null) {
    const contractName = match[1];
    const baseStr = match[2] || '';
    const baseContracts = baseStr
      .split(',')
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);

    // Find contract line number
    const matchIndex = match.index;
    const lineNumber = content.substring(0, matchIndex).split('\n').length;

    // Extract functions inside this contract
    const functions: ParsedFunction[] = [];
    const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*([^{;]*)(?:\{|;)/g;
    let fMatch: RegExpExecArray | null;

    while ((fMatch = funcRegex.exec(content)) !== null) {
      const funcName = fMatch[1];
      const attributes = fMatch[3] || '';
      const fLine = content.substring(0, fMatch.index).split('\n').length;

      let visibility: 'public' | 'external' | 'internal' | 'private' = 'public';
      if (attributes.includes('external')) visibility = 'external';
      else if (attributes.includes('internal')) visibility = 'internal';
      else if (attributes.includes('private')) visibility = 'private';
      else if (attributes.includes('public')) visibility = 'public';

      const modifiers: string[] = [];
      const modMatches = attributes.match(/(?:onlyOwner|requiresAuth|auth|onlyRole|hasRole)/g);
      if (modMatches) {
        modifiers.push(...modMatches);
      }

      functions.push({
        name: funcName,
        visibility,
        modifiers,
        parameters: [],
        bodyRawText: '',
        loc: {
          start: { line: fLine, column: 0 },
          end: { line: fLine + 10, column: 0 },
        },
        isConstructor: false,
        contractName,
        fileName,
      });
    }

    contracts.push({
      name: contractName,
      kind: 'contract',
      baseContracts,
      functions,
      modifiers: [],
      stateVariables: [],
      loc: {
        start: { line: lineNumber, column: 0 },
        end: { line: lines.length, column: 0 },
      },
      fileName,
    });
  }

  return contracts;
}

/**
 * Extracts clean code snippets with exact line numbers.
 */
export function extractCodeSnippet(
  content: string,
  startLine: number,
  endLine: number,
  padding: number = 0
): string {
  const lines = content.split('\n');
  const actualStart = Math.max(1, startLine - padding);
  const actualEnd = Math.min(lines.length, endLine + padding);

  return lines
    .slice(actualStart - 1, actualEnd)
    .map((line, idx) => {
      const lineNum = actualStart + idx;
      return `${lineNum.toString().padStart(4, ' ')} | ${line}`;
    })
    .join('\n');
}
