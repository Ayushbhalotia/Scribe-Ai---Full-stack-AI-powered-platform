export const storeInsession = (key,value) =>{
    sessionStorage.setItem(key,value);

}

export const lookinsession = (key) =>{
    return sessionStorage.getItem(key)
}

export const removefromsession = (key) =>{
    return sessionStorage.removeItem(key)

}

export const logoutuser= () =>{
    sessionStorage.clear();

}
