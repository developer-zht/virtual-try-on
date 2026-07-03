(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var success = style.getPropertyValue('--success').trim();
  var danger = style.getPropertyValue('--danger').trim();

  // --- 时间对比柱状图 ---
  var chart1 = echarts.init(document.getElementById('chart-timing'), null, { renderer: 'svg' });
  chart1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['上传耗时', '生成耗时'], bottom: 0, textStyle: { color: muted } },
    grid: { left: '10%', right: '8%', top: '15%', bottom: '20%' },
    xAxis: {
      type: 'category',
      data: ['aitryon', 'qwen 文字模式', 'qwen 参考图模式'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 13 }
    },
    yAxis: {
      type: 'value', name: '耗时 (秒)',
      nameTextStyle: { color: muted },
      axisLine: { show: false },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule, type: 'dashed', opacity: 0.6 } }
    },
    series: [
      { name: '上传耗时', type: 'bar', stack: 'total',
        data: [1.3, 0, 0], itemStyle: { color: accent2 },
        label: { show: true, formatter: function(p) { return p.value > 0 ? p.value + 's' : ''; }, color: ink, fontSize: 11 }
      },
      { name: '生成耗时', type: 'bar', stack: 'total',
        data: [7.2, 17.3, 32.9], itemStyle: { color: accent },
        label: { show: true, position: 'top', formatter: '{c}s', color: ink, fontSize: 14, fontWeight: 600 }
      }
    ]
  });
  window.addEventListener('resize', function() { chart1.resize(); });

  // --- 完整性雷达图 ---
  var chart2 = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  chart2.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    legend: { bottom: 0, textStyle: { color: muted } },
    radar: {
      indicator: [
        { name: '上装', max: 1 },
        { name: '下装准确', max: 1 },
        { name: '鞋子', max: 1 },
        { name: '饰品', max: 1 },
        { name: '人脸保留', max: 1 },
        { name: '速度', max: 1 }
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
        { value: [1, 0, 0, 0, 1, 1], name: 'aitryon', itemStyle: { color: accent }, areaStyle: { opacity: 0.2 } },
        { value: [1, 1, 1, 1, 1, 0.5], name: 'qwen 文字模式', itemStyle: { color: accent2 }, areaStyle: { opacity: 0.2 } },
        { value: [1, 1, 1, 1, 1, 0.26], name: 'qwen 参考图模式', itemStyle: { color: success }, areaStyle: { opacity: 0.2 } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chart2.resize(); });
})();
