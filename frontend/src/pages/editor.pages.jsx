import { useContext, useEffect, useState } from "react";
import { usercontext } from "../App";
import { Navigate, useParams } from "react-router-dom";
import BlogEditor from "../components/blog-editor.component";
import Publishform from "../components/publish-form.component";
import { createContext } from "react";
import Loader from "../components/loader.component";
import axios from "axios";

 const blogStructure = {
    title: '',
    banner: '',
    content: [],
    tags: [],
    des: '',
    author: {personal_info:{}}
 }

 export const EditorContext = createContext({ });

const Editor = () =>{

    let {blog_id}= useParams();

const [blog , setBlog] = useState(blogStructure);
const[editorState,setEditorState] = useState("editor");
const[textEditor,settextEditor] = useState({isReady:false});
// toh yaha context bana diye and isme texteditor ko trackj karne ke liye banaye hai matlab jitna text hai usko treack karna and settexteditor karke usko set karke track karna and phir usko use kar sake tab jab maanlo page change kare toh text udd jayega toh wo na ude and also publishform me saare text mil jaayee jo likha gya hai and sab kluch toh isliye context banaye hai isready jo hota hai wo false kiye and jab useeffect chala and waha check karenge ki kuya ready hai tab karenge toh jisse ek hio banega editor do nhi kyuki strictmode toh halaki comment karnee se ek hi ayeg and isready editor ka hi hai 
// halaki abhi text ka kaam nhi kiye kyuki yaha usestate se daale isready ka value 
const [loading,setLoading] = useState(true);

useEffect(()=>{
    // yadi blogid nhi ho matlab blog ko click nhi kiye hai edit ke liye normally edit pe gye hai jisse ye editor ChannelMergerNode;a hai yaha 

    if(!blog_id){
return setLoading(false);

    }

axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog",{blog_id,draft:true,mode:'edit'})

.then(({data:{blog}})=>{
    setBlog(blog);
    setLoading(false);
})
.catch(err=>{
    setBlog(null);
    setLoading(false);

})

},[])

let {userauth : {access_token}} = useContext(usercontext)

    return (

<EditorContext.Provider value={{blog,setBlog,editorState,setEditorState,textEditor,settextEditor}}>
{

access_token === null ? <Navigate to="/signin" />
        : 
        loading ? <Loader /> :
        editorState== "editor" ? <BlogEditor /> : <Publishform />
}
</EditorContext.Provider>
      
    )
}

export default Editor;