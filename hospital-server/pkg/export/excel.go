package export

import (
	"fmt"
	"io"

	"github.com/xuri/excelize/v2"
)

type ExcelWriter struct {
	file  *excelize.File
	sheet string
	row   int
}

func NewExcelWriter(sheetName string) *ExcelWriter {
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", sheetName)
	return &ExcelWriter{file: f, sheet: sheetName, row: 1}
}

func (w *ExcelWriter) WriteHeader(headers []string) error {
	style, _ := w.file.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E2E8F0"}, Pattern: 1},
	})

	for i, h := range headers {
		cell := fmt.Sprintf("%s%d", colName(i), w.row)
		w.file.SetCellValue(w.sheet, cell, h)
		w.file.SetCellStyle(w.sheet, cell, cell, style)
	}
	w.row++
	return nil
}

func (w *ExcelWriter) WriteRow(values []interface{}) {
	for i, v := range values {
		cell := fmt.Sprintf("%s%d", colName(i), w.row)
		w.file.SetCellValue(w.sheet, cell, v)
	}
	w.row++
}

func (w *ExcelWriter) WriteTo(writer io.Writer) error {
	return w.file.Write(writer)
}

func (w *ExcelWriter) Close() error {
	return w.file.Close()
}

func colName(index int) string {
	name := ""
	for index >= 0 {
		name = string(rune('A'+index%26)) + name
		index = index/26 - 1
	}
	return name
}
