using DesignPatterns.TemplateMethod;

Console.WriteLine("=== Template Method Pattern: Data importer ===");

const string csv = """
    sku,name,price
    bk-001,Clean Code,32.50
    bk-002,,18.00
    bk-003,Refactoring,-5.00
    bk-004,Design Patterns,45.00
    """;

const string json = """
    [
      {"sku": "el-100", "name": "USB-C cable", "price": 9.99},
      {"sku": "el-200", "name": "Headphones", "price": 59.90},
      {"sku": "el-300", "name": "", "price": 12.00}
    ]
    """;

// The client calls the same template method; each subclass fills in different steps.
Console.WriteLine("--- CsvImporter ---");
new CsvImporter().Import(csv);

Console.WriteLine("--- JsonImporter ---");
new JsonImporter().Import(json);
