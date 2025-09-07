import express from "express"
import addressRoutes from "./addressRoutes.js"
// import { authUser } from "../../middleware/auth.js"

export default ()=>{ // เดิม (db)
    const router=express.Router()
    // router.use(addressRoutes(db))
    // router.use("/mongo", mongoAddress) // คือไร? ติดไว้ก่อน 🥴
    router.use("/", addressRoutes) // ไม่จำเป็นต้องใส่ authUser ซ้ำ ที่ routes.js เว้นแต่จะอยาก auth ทั้ง group /address ทั้งหมด
    return router
}