import { motion } from 'framer-motion';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Cell, flexRender } from "@tanstack/react-table";
import { CSSProperties, useContext } from "react";
import { DataGridContext } from "./Context";
import { Trans } from "react-i18next";
import { mainTransition } from '../../Styles/animations';
import { getCommonPinningStyles } from "./helpers";

const variants = {
    enter: {
        name: 'enter',
        opacity: 0,
        transition: mainTransition
    },
    active: {
        name: 'active',
        opacity: 1,
        transition: { ...mainTransition, delay: 0.5 }
    },
    exit: {
        name: 'exit',
        opacity: 0,
        transition: mainTransition
    }
};

export const DragAlongCell = ({ cell }: { cell: Cell<any, unknown>; }) => {
    const { isDragging, setNodeRef, transform, transition } = useSortable({
        transition: {
            duration: 250,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        },
        animateLayoutChanges: ({ isDragging }) => !isDragging,
        id: cell.column.id
    });

    const style: CSSProperties = {
        opacity: isDragging ? 0.8 : 1,
        position: 'relative',
        transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
        transition,
        // width: cell.column.getSize(),
        zIndex: isDragging ? 1 : 0,
        textAlign: 'center',
        // paddingLeft: '1rem',
        ...getCommonPinningStyles(cell.column),
    };

    // switch (useContext(DataGridContext)!.density.value) {
    //     case 'compact':
    //         style.padding = '0.25rem 0.25rem';
    //         break;
    //     case 'standard':
    //         style.padding = '0.5rem 0.5rem';
    //         break;
    //     case 'comfortable':
    //         style.padding = '0.75rem 0.75rem';
    //         break;
    //     default:
    //         break;
    // }

    return (
        <motion.td
            initial='enter'
            animate='active'
            exit='exit'
            variants={variants}
            style={style}
            ref={setNodeRef}
        >
            <div>
                <Trans>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Trans>
            </div>
        </motion.td>
    );
};
