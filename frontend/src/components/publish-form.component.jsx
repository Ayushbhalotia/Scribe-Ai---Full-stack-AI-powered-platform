import { Toaster,toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";
import Tag from "./tags.component";
import axios from "axios";
import { usercontext } from "../App";
import { useNavigate, useParams } from "react-router-dom";

const Publishform = () =>{
let characterLimit = 200;
let tagLimit = 10;

let {blog_id} = useParams();

let {blog, blog:{banner,title,tags,des,content},setEditorState,setBlog} = useContext(EditorContext)

let {userauth : {access_token} } = useContext(usercontext)

let navigate = useNavigate();

    const handleCloseEvent = () =>{
setEditorState("editor")

    }

    const handleBlogTitleChange = (e) =>{
let input= e.target;
setBlog({...blog,title:input.value})
    }

const handleBlogDesChange = (e) =>{
    let input = e.target;
    setBlog({...blog,des:input.value})
}

const handletitlekeydown = (e) =>{
   if(e.keyCode == 13){
    e.preventDefault();
}

}

const handleKeyDown =(e) =>{
   if(e.keyCode==13 || e.keyCode == 188){
e.preventDefault();
let tag = e.target.value;

if(tags.length < tagLimit){
    if(!tags.includes(tag) && tag.length){
        setBlog({...blog,tags:[...tags,tag]})
    }
}else{
    toast.error(`You can add max ${tagLimit} tags`)
}
e.target.value="";

   }
}
// ab yaha jo bhi topics me likhenge and yadi , ya enter click kiye toh ye chalega and isme sabse pehle check hoga ki kya tags jo ki array hai uskla length halaki starting me toh 0 hogaand aise hi phir bharte jayeg ab phir check karenge ki tag pehle se toh nhi diye hue hai and also tag ka length kuch toh hona chahiye likhe hai and tag ko add kar denge phir wo tag array jab updtate hua yaha par map function chalega tag component render hoga and phir tags dikhega and waha cross button se hatega tag ye sab dena hai and tag me click karke tag ko update bhi kar paa rhe hai directly wo bhi dekhna hai jo ki tags.component.jsx me karenge 

const publishBlog =(e) =>{

    if(e.target.className.includes("disable")){
 return;
    }
    
        if(!title.length){
        return toast.error("write blog title before publishing")
    }

    if(!des.length || des.length > characterLimit){
        return toast.error(`write a description about your blog within ${characterLimit} characters to publish`)

    }

    if(!tags.length){
        return toast.error("enter at least 1 tag to help us rank your blog")
    }

let loadingToast = toast.loading("publishing.....");

e.target.classList.add('disable');

let blogObj = {
    title,banner,des,content,tags,draft: false
}
axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",{...blogObj,id:blog_id},{
    headers :{

        'Authorization' : `Bearer ${access_token}`
    }

})

.then(()=>{
    e.target.classList.remove("disable")
    toast.dismiss(loadingToast);
    toast.success("published");

    setTimeout(()=>{
navigate("/dashboard/blogs")
    },500);

})
.catch(({response})=>{
    e.target.classList.remove("disable")
    toast.dismiss(loadingToast);
    
    return toast.error(response.data.error)
})

}

    return(
      <AnimationWrapper>
<section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16 lg:gap-4">

    <Toaster />

<button className="w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]"
onClick={handleCloseEvent}
>
    <i className="fi fi-br-cross"></i>
</button>

<div className="max-w-[550px] center">
    <p className="text-dark-grey mb-1">Preview</p>

<div className="w-full aspect-video rounded-lg overflow-hidden bg-grey mt-4">
    <img src={banner} />
</div>

<h1 className="text-4xl font-medium mt-2 leading-tight line-clamp-2">{title}</h1>
{}

<p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">{des}</p>
</div>

<div className="border-grey lg:border-1 lg:pl-8">
    <p className="text-dark-grey mb-2 mt-9">Blog Title</p>
    <input type="text" placeholder="Blog Title"
    defaultValue ={title} className="input-box pl-4"
    onChange={handleBlogTitleChange}
    />
    {}

    <p className="text-dark-grey mb-2 mt-9">Short Description about your blog</p>
  
    <textarea
    maxLength={characterLimit}
    defaultValue={des}
    className="h-40 resize-none leading-7 input-box pl-4"
    onChange={handleBlogDesChange}
    onKeyDown={handletitlekeydown}

    >
    </textarea>
<p className="mt-1 text-dark-grey text-sm text-right">{characterLimit - des.length}
    characters left
</p>

<p className="text-dark-grey mb-2 mt-9">Topics - (Helps is searching and ranking your blog post)</p>

<div className="relative input-box pl-2 py-2 pb-4">
<input type="text" placeholder="Topic"
className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white"
onKeyDown={handleKeyDown}
/>

{
tags.map((tag,i)=>{
return <Tag tag={tag} tagIndex={i} key={i} />
})
}
{}

</div>
<p className="mt-1 mb-4 text-dark-grey text-right">{tagLimit-tags.length} tags left</p>

<button className="btn-dark px-8"
onClick={publishBlog}
>publish</button>
</div>

</section>

      </AnimationWrapper>
    )
}

export default Publishform;