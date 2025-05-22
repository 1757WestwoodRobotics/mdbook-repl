import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from "react";

import useResizeObserver from "@/hooks/useResizeObserver";

import { defaultCodes } from "@/data/app";
import { Output, OutputsType } from "@/types/output";
import { InputsType } from "@/types/input";
import { Editor, EditorType, Language } from "@/types/editor";

const workers = {
  python: new URL("../workers/python-worker.js", import.meta.url).toString(),
  typescript: new URL("../workers/typescript-worker.js", import.meta.url).toString(),
  javascript: new URL("../workers/javascript-worker.js", import.meta.url).toString()
};

const defaultOutputs: OutputsType = {
  python: { status: "loading", data: [] },
  typescript: { status: "loading", data: [] },
  javascript: { status: "loading", data: [] }
};

const defaultInputs: InputsType = {
  python: { status: "idle", data: [], notifier: null },
  typescript: { status: "idle", data: [], notifier: null },
  javascript: { status: "idle", data: [], notifier: null }
};

const defaultEditorOptions: EditorType = {
  theme: "light",
  lang: "python",
  code: defaultCodes.python,
  defaultCode: defaultCodes.python,
  readonly: false
};

interface AppContextProps {
  editor: EditorType;
  setEditor: Dispatch<SetStateAction<EditorType>>;

  outputs: OutputsType;
  inputs: InputsType;
  isFullscreen: boolean | null;

  execuateCode: () => void;
  clearOutput: () => void;
  clearInput: () => void;
}

const AppContext = createContext<AppContextProps>({
  editor: defaultEditorOptions,
  setEditor: () => {},

  outputs: defaultOutputs,
  inputs: defaultInputs,
  isFullscreen: null,

  execuateCode: () => {},
  clearOutput: () => {},
  clearInput: () => {}
});

interface AppContextProviderProps {
  children: React.ReactNode;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const dimensions = useResizeObserver("#root");

  const [id, setId] = useState<string>("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [outputs, setOutputs] = useState<OutputsType>(defaultOutputs);
  const [inputs, setInputs] = useState<InputsType>(defaultInputs);
  const [isFullscreen, setIsFullscreen] = useState<boolean | null>(null);
  const [editor, setEditor] = useState<EditorType>(defaultEditorOptions);

  function postmessage() {
    const message = { id, editor, output: outputs[editor.lang], dimensions };
    window.parent.postMessage({ repl: message }, "*");
  }

  // post message to worker
  function execuateCode() {
    if (!worker) return;
    if (outputs[editor.lang].status === "loading" || outputs[editor.lang].status === "running") return;

    setOutputs((prev) => ({ ...prev, [editor.lang]: { status: "running", data: [] } }));
    worker.postMessage({ lang: editor.lang, code: editor.code });
  }

  function clearOutput() {
    setOutputs((prev) => ({ ...prev, [editor.lang]: { status: "idle", data: [] } }));
  }
  function clearInput() {
    setInputs((prev) => ({ ...prev, [editor.lang]: { status: "idle", data: [], notifier: null } }));
  }

  // listen theme change
  useEffect(() => {
    document.documentElement.style.colorScheme = editor.theme;
    document.body.classList.toggle("dark", editor.theme === "dark");
  }, [editor.theme]);

  // listen lang change
  useEffect(() => {
    const lang = editor.lang;
    // terminate previous worker
    if (worker) worker.terminate();
    // start new worker
    const newWorker = new Worker(workers[lang], { type: "classic", name: `${lang}-worker` });
    // newWorker.postMessage({"sab": sab})
    newWorker.onmessage = (event: MessageEvent) => {
      if(event.data.promp !== undefined){
        console.log(event.data.promp)
        const notifier = new Int32Array(event.data.promp.sab)

        let view = new Uint16Array(event.data.promp.sab);

        const parsedLang = Language.safeParse(event.data.lang);
        if (!parsedLang.success) return;
        setInputs((prev) => ({...prev, [parsedLang.data]: { status: "query", data: view, notifier}}));
        console.log("input set")
        // view[0] = val.length
        // for(let i=0;i<val.length;i++)
        //   view[i+2] = val.charCodeAt(i)
        // console.log(Atomics.notify(notifier, 0));

      }else{
      const parsedLang = Language.safeParse(event.data.lang);
      const parsedOutput = Output.safeParse(event.data.output);
      if (!parsedOutput.success || !parsedLang.success) return;

      const data = parsedOutput.data.data;
      const status = parsedOutput.data.status;
      setOutputs((prev) => ({ ...prev, [parsedLang.data]: { status, data: [...prev[lang].data, ...data] } }));
      }
    };
    setWorker(newWorker);
  }, [editor.lang]);

  // post message to parent window
  useEffect(() => {
    const timeout = setTimeout(() => id && postmessage(), 10);

    return () => clearTimeout(timeout);
  }, [id, dimensions.height]);

  // listen for messages from parent window
  useEffect(() => {
    const onmessage = (event: MessageEvent) => {
      if (event.source === window || !event.data.repl) return;
      if (typeof event.data.repl.id !== "string") return;

      const parsedEditor = Editor.safeParse(Object.assign(editor, event.data.repl.editor));
      if (!parsedEditor.success) return;

      setId(event.data.repl.id);
      setEditor({ ...parsedEditor.data });
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenEnabled) setIsFullscreen(null);
      else setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();

    window.addEventListener("message", onmessage);
    postmessage();

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("message", onmessage);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        editor,
        setEditor,

        outputs,
        inputs,
        isFullscreen,

        execuateCode,
        clearOutput,
        clearInput
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
