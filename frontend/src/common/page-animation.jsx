import {AnimatePresence,motion} from "framer-motion";

const AnimationWrapper = ({children,initial={opacity:0},animate={opacity:1},transition ={duration:1},keyvalue,classname}) =>{
    return (
        <AnimatePresence>
        <motion.div
        key={keyvalue}
        initial={initial}
animate={animate}
transition={transition}
className={classname}
        >
{}
{}

            {children}
        </motion.div>
        </AnimatePresence>
    )
}

export default AnimationWrapper;