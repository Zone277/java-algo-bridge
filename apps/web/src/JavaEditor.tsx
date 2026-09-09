import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/java/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import type { Diagnostic } from '@jab/contracts';

(globalThis as typeof globalThis & { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = { getWorker: () => new EditorWorker() };

export default function JavaEditor({ source, onChange, diagnostics }: {
  source: string; onChange: (source: string) => void; diagnostics: Diagnostic[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialSource = useRef(source);

  useEffect(() => {
    if (!container.current) return;
    const model = monaco.editor.createModel(initialSource.current, 'java');
    const editor = monaco.editor.create(container.current, {
      model, theme: 'vs', automaticLayout: true, minimap: { enabled: false },
      fontSize: 14, lineHeight: 23, scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 }, tabSize: 4,
      ariaLabel: 'Java 源码', wordWrap: 'on', fixedOverflowWidgets: true,
    });
    editorRef.current = editor;
    const listener = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()));
    return () => { listener.dispose(); editor.dispose(); model.dispose(); editorRef.current = null; };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && source !== editor.getValue()) editor.setValue(source);
  }, [source]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, 'javac', diagnostics.filter(d => d.belongsToStudentSource && d.line !== null).map(d => ({
      severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
      message: d.message, startLineNumber: d.line!, endLineNumber: d.line!,
      startColumn: d.column ?? 1, endColumn: d.column === null ? model.getLineMaxColumn(Math.min(d.line!, model.getLineCount())) : d.column + 1,
    })));
  }, [diagnostics]);

  return <div className="java-editor" data-testid="java-editor" ref={container} />;
}
