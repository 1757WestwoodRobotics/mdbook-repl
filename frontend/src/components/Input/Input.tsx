import {useState} from "react";
import style from "./Input.module.css";
import { useAppContext } from "@/contexts/AppProvider";

export default function Input(){
  const { editor, inputs, clearInput } = useAppContext();

  const [data, setData] = useState('');
  const input = inputs[editor.lang];


  let sendMessage = () => {
    console.log(input)
    console.log(data)
    let view = input.data;
    view[0] = data.length;
    for(let i=0;i<data.length;i++)
      view[i+2]=data.charCodeAt(i)
    Atomics.notify(input.notifier,0)
    setData("")
    clearInput()
  }
   if (input.status === "idle"){
     return null
   }
  return (
    <div className={style.wrapper}>
      <div className={style.input}>
        <div className={style.line}>
          <span>&gt;</span>
          <input type="text" value={data} onChange={e => setData(e.target.value)}/>
          <input type="button" onClick={sendMessage} value="Send Input"/>
        </div>
      </div>
    </div>
  )
}
