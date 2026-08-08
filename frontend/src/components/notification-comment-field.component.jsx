import { useContext, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { usercontext } from "../App";
import axios from "axios";

const NotificationCommentField = ({_id,blog_author,index=undefined,replyingTo=undefined,setReplying,notification_id,notificationData}) =>{

let [comment,setComment] = useState('')
let{_id:user_id} = blog_author;
let{userauth:{access_token}}= useContext(usercontext);
let{notifications,notifications:{results},setNotifications} = notificationData;

const handleComment = () =>{
            if(!comment.length){
                return toast.error("write something to leave a comment....")
            }
    
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",{
        _id,blog_author:user_id,comment,replying_to :replyingTo,notification_id
        // notification id jo bhej rhe hai jo commen me reply kar rhe chahte ha usske notification i e rply me jo reply kiye wo rakhe jisse usko le paaye yaha 

    },{
        headers:{
            'Authorization' : `Bearer ${access_token}`
        }
    })
    .then(({data}) =>{
     
      setReplying(false);
results[index].reply = {comment,id:data._id};
setNotifications({...notifications,results})

    })
    .catch(err=>{
        console.log(err);
    })
}

       return (
    <>
    <Toaster />
    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a reply..." className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"></textarea>
    <button className="btn-dark mt-5 px-10" onClick={handleComment}>Reply</button>
    </>
    )
}
export default NotificationCommentField;