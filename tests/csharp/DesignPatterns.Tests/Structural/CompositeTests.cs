using DesignPatterns.Composite;
// Avoid clashing with System.IO.File / System.IO.Directory from the implicit usings.
using Directory = DesignPatterns.Composite.Directory;
using File = DesignPatterns.Composite.File;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class CompositeTests
{
    private static Directory BuildProject(out Directory src, out Directory assets)
    {
        src = new Directory("src").Add(
            new File("index.ts", 300),
            new File("app.ts", 2400),
            new Directory("components").Add(new File("Header.tsx", 1500), new File("Footer.tsx", 900)));
        assets = new Directory("assets").Add(new File("logo.png", 5120), new File("styles.css", 640));
        return new Directory("project").Add(new File("README.md", 1200), new File("package.json", 800), src, assets);
    }

    [Fact]
    public void File_is_a_leaf_with_its_own_size_and_a_single_file()
    {
        var file = new File("app.ts", 2400);

        Assert.Equal(2400, file.Size());
        Assert.Equal(1, file.CountFiles());
        Assert.Equal(["app.ts"], file.FindByExtension(".ts"));
        Assert.Empty(file.FindByExtension(".tsx"));
    }

    [Fact]
    public void Directory_size_aggregates_every_nested_file()
    {
        var project = BuildProject(out var src, out var assets);

        Assert.Equal(5100, src.Size());
        Assert.Equal(5760, assets.Size());
        Assert.Equal(12860, project.Size());
    }

    [Fact]
    public void Count_files_counts_leaves_only_not_directories()
    {
        var project = BuildProject(out var src, out _);

        Assert.Equal(4, src.CountFiles());
        Assert.Equal(8, project.CountFiles());
    }

    [Fact]
    public void Empty_directory_has_no_size_and_no_files()
    {
        var empty = new Directory("empty");

        Assert.Equal(0, empty.Size());
        Assert.Equal(0, empty.CountFiles());
        Assert.Empty(empty.FindByExtension(".ts"));
    }

    [Fact]
    public void Find_by_extension_searches_the_whole_tree_in_order_and_matches_the_suffix_exactly()
    {
        var project = BuildProject(out _, out _);

        Assert.Equal(["index.ts", "app.ts"], project.FindByExtension(".ts"));
        Assert.Equal(["Header.tsx", "Footer.tsx"], project.FindByExtension(".tsx"));
    }

    [Fact]
    public void Clients_treat_a_leaf_and_a_composite_uniformly()
    {
        FileSystemNode[] nodes = [new File("app.ts", 2400), new Directory("lib").Add(new File("a.ts", 10), new File("b.ts", 20))];

        Assert.Equal([2400L, 30L], nodes.Select(node => node.Size()));
        Assert.Equal([1, 2], nodes.Select(node => node.CountFiles()));
    }

    [Fact]
    public void Add_is_fluent_and_keeps_children_in_insertion_order()
    {
        var a = new File("a", 1);
        var b = new File("b", 2);
        var dir = new Directory("dir");

        Assert.Same(dir, dir.Add(a).Add(b));
        Assert.Equal([a, b], dir.Children);
    }

    [Fact]
    public void Removing_a_subtree_updates_every_aggregate()
    {
        var project = BuildProject(out _, out var assets);

        Assert.True(project.Remove(assets));

        Assert.Equal(7100, project.Size());
        Assert.Equal(6, project.CountFiles());
        Assert.DoesNotContain(assets, project.Children);
    }

    [Fact]
    public void Remove_only_affects_direct_children()
    {
        var project = BuildProject(out var src, out _);
        var nested = src.Children[0];

        Assert.False(project.Remove(nested));
        Assert.Equal(12860, project.Size());
    }

    [Fact]
    public void Print_indents_each_level_and_shows_aggregated_sizes()
    {
        var dir = new Directory("src").Add(new File("index.ts", 300), new Directory("lib").Add(new File("a.ts", 10)));
        using var console = new ConsoleCapture();

        dir.Print();

        Assert.Equal("src/ (310 bytes)\n  index.ts (300 bytes)\n  lib/ (10 bytes)\n    a.ts (10 bytes)\n", console.Output);
    }
}
