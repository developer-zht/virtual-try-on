(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var success = style.getPropertyValue('--success').trim();

  // --- 时间+细节评分对比 ---
  var chart1 = echarts.init(document.getElementById('chart-compare'), null, { renderer: 'svg' });
  chart1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { bottom: 0, textStyle: { color: muted } },
    grid: { left: '10%', right: '8%', top: '12%', bottom: '20%' },
    xAxis: {
      type: 'category',
      data: ['纯文字', '截断参考图', '拼接图'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 13 }
    },
    yAxis: [
      { type: 'value', name: '耗时(秒)', nameTextStyle: { color: muted }, axisLine: { show: false }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed', opacity: 0.5 } } },
      { type: 'value', name: '细节评分', min: 0, max: 5, nameTextStyle: { color: muted }, axisLine: { show: false }, axisLabel: { color: muted }, splitLine: { show: false } }
    ],
    series: [
      { name: '耗时(秒)', type: 'bar', yAxisIndex: 0,
        data: [17.0, 32.9, 25.2], itemStyle: { color: accent },
        barWidth: '30%',
        label: { show: true, position: 'top', formatter: '{c}s', color: ink, fontSize: 13, fontWeight: 600 }
      },
      { name: '细节还原评分', type: 'line', yAxisIndex: 1,
        data: [2.5, 3.5, 4.5], itemStyle: { color: accent2 }, lineStyle: { width: 3 },
        symbol: 'circle', symbolSize: 10,
        label: { show: true, formatter: '{c}', color: accent2, fontSize: 13, fontWeight: 600 }
      }
    ]
  });
  window.addEventListener('resize', function() { chart1.resize(); });

  // --- 细节还原雷达图 ---
  var chart2 = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  chart2.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    legend: { bottom: 0, textStyle: { color: muted } },
    radar: {
      indicator: [
        { name: '上装图案', max: 5 },
        { name: '下装图案', max: 5 },
        { name: '鞋子款式', max: 5 },
        { name: '饰品细节', max: 5 },
        { name: '颜色准确', max: 5 },
        { name: '材质纹理', max: 5 }
      ],
      shape: 'polygon',
      axisName: { color: ink, fontSize: 12 },
      splitArea: { show: false },
      splitLine: { lineStyle: { color: rule } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      data: [
        { value: [3, 3, 2, 2, 4, 2], name: '纯文字', itemStyle: { color: accent }, areaStyle: { opacity: 0.15 } },
        { value: [5, 5, 3, 3, 5, 4], name: '截断参考图', itemStyle: { color: accent2 }, areaStyle: { opacity: 0.15 } },
        { value: [4, 4, 5, 4, 5, 4], name: '拼接图', itemStyle: { color: success }, areaStyle: { opacity: 0.2 } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chart2.resize(); });
})();
