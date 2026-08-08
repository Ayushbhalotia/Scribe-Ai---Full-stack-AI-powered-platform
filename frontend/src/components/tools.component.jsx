

import Embed from "@editorjs/embed";
import List from "@editorjs/list";
import Image from "@editorjs/image";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";

import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import axios from "axios";

const uploadImageByFile = (e) =>{
   console.log(e)
const formdata = new FormData();
formdata.append("image",e);

 return axios.post(import.meta.env.VITE_SERVER_DOMAIN + '/get-upload', formdata)
.then(({data})=>{
    return {
        success: 1,
        file: { url: data.url }
    };
    
})
.catch((error) => {
  console.error('Error uploading image:', error);
  return {
    success: 0,
    message: 'Could not upload image'
  };
});

}

const uploadImageByURL=(e) =>{
    let link = new Promise((resolve,reject)=>{
        try{
            resolve(e)
        }
        catch(err){
            reject(err)
        }
    })
    return link.then(url=>{
        return{
            success : 1,
            file:{ url }
        }
    })
}

export const tools ={
    embed:Embed,

     list:{
        class:List,
        inlineToolbar:true
     },

    image:{
        class:Image,
        config:{
            uploader:{
                uploadByUrl:uploadImageByURL,
                uploadByFile:uploadImageByFile,
            }
        }
    },

    header:{
        class:Header,
        config:{
            placeholder:"Type Heading....",
            levels:[2,3],
            defaultLevel:2
        }
    },

    quote:{
        class:Quote,
        inlineToolbar:true

    },
    maker:Marker,
    
    inlineCode: InlineCode

    }
