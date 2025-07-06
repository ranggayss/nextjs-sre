import { useEffect, useState } from "react";


export default function Coba(){
    const [article, setArticle] = useState(null);

    const getArticle = async () => {
        const res = await fetch('/api/articles');
        

    }

    useEffect(() => {
    }, []);

}