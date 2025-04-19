import { t } from "i18next";
import { useContext } from "react";
import { DataGridContext } from "./Context";
import { Row } from "@tanstack/react-table";
import { FileDownIcon } from "lucide-react";
import { Button } from "../Base/Button";

export function ExportButton() {
    const table = useContext(DataGridContext)!.table!

    return (
        <>
            <Button
                variant='outline'
                onClick={async () => {
                    const json = JSON.stringify(([] as Row<any>[]).concat(table.getTopRows(), table.getCenterRows(), table.getBottomRows()), undefined, 4)

                    const blob = new Blob([json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)

                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', 'data.json')
                    
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    
                    URL.revokeObjectURL(url)
                }}
            >
                <FileDownIcon />
            </Button >
        </>
    )
}
