package fib

import (
	"testing"
)

func BenchmarkFib10(b *testing.B) {
	for i := 0; i < b.N; i++ {
		var _ = Fib(10)
	}
	b.ReportMetric(3.0, "auxMetricUnits")
}

func BenchmarkFib20(b *testing.B) {
	for i := 0; i < b.N; i++ {
		var _ = Fib(20)
	}
	b.ReportMetric(4.0, "auxMetricUnits")
}
