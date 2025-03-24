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
                    // const path = await (window as typeof window & { appAPI: appAPI }).appAPI.saveFileDialog();
                    // if (path.canceled)
                    //     return

                    // (window as typeof window & { appAPI: appAPI }).appAPI.saveFile({ content: json, path: path.filePath })
                }}
            >
                <FileDownIcon />{t('DataGrid.export')}
            </Button >
        </>
    )
}

